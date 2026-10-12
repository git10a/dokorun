// Public OpenNext cache only. Images and application databases are never touched.
// node scripts/cache-retention.mjs plan <plan.json>
// node scripts/cache-retention.mjs apply <plan.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const account = '481f7c24fd2dab0398f865ae3034147d';
const bucket = 'dokorun-opennext-cache';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export function selectRetiredBuilds(objects, activeBuilds, now = Date.now()) {
  if (!activeBuilds.length) throw Error('Active build could not be identified.');
  const groups = new Map();
  for (const object of objects) {
    const match = /^incremental-cache\/([A-Za-z0-9_-]{21})\/[a-f0-9]{64}\.(?:cache|fetch)$/.exec(object.key);
    if (!match) throw Error('Unknown cache key format; stop and inspect before cleanup.');
    const modified = Date.parse(object.last_modified);
    if (!Number.isFinite(modified) || !Number.isFinite(object.size)) throw Error('Invalid object metadata.');
    const id = match[1];
    const group = groups.get(id) ?? { buildId: id, prefix: `incremental-cache/${id}/`, count: 0, bytes: 0, first: modified, last: modified };
    group.count++; group.bytes += object.size;
    group.first = Math.min(group.first, modified); group.last = Math.max(group.last, modified);
    groups.set(id, group);
  }
  for (const id of activeBuilds) if (!groups.has(id)) throw Error('Active build missing from inventory.');
  // Keep the active builds, the three most recently populated builds, and every
  // build written within 30 days. Even an old rollback build remains protected.
  const recent = [...groups.values()].sort((a, b) => b.first - a.first).slice(0, 3).map(g => g.buildId);
  const protectedIds = new Set([...activeBuilds, ...recent]);
  const cutoff = now - 30 * 86400000;
  return [...groups.values()].map(g => ({ ...g, retire: !protectedIds.has(g.buildId) && g.last < cutoff }));
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!['plan', 'apply'].includes(command) || !file) throw Error('Usage: cache-retention.mjs plan|apply <plan.json>');
  const token = process.env.CLOUDFLARE_API_TOKEN ?? readFileSync(`${homedir()}/Library/Preferences/.wrangler/config/default.toml`, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  if (!token) throw Error('Cloudflare authentication is required.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
  async function request(path, options = {}) {
    const response = await fetch(base + path, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error(`Cloudflare HTTP ${response.status}`);
    return response;
  }
  async function api(path, options) {
    const json = await (await request(path, options)).json();
    if (json.success === false) throw Error(JSON.stringify(json.errors));
    return json;
  }
  const deployment = (await api('/workers/scripts/dokorun/deployments')).result.deployments[0];
  if (deployment.versions.length !== 1 || deployment.versions[0].percentage !== 100) throw Error('Do not clean during a canary deployment.');
  // Content endpoint is used only to identify the currently active version;
  // do not rely on its version query parameter for retired version mapping.
  const source = await (await request('/workers/scripts/dokorun/content/v2')).text();
  const activeBuilds = [...new Set([...source.matchAll(/(?:NEXT_BUILD_ID|OPEN_NEXT_BUILD_ID|buildId)["']?\s*[:=]\s*["']([A-Za-z0-9_-]{21})["']/g)].map(m => m[1]))];
  const lifecyclePath = `/r2/buckets/${bucket}/lifecycle`;
  const lifecycle = (await api(lifecyclePath)).result;
  if (command === 'plan') {
    const objects = []; let cursor; const seen = new Set();
    do {
      const params = new URLSearchParams({ per_page: '1000' });
      if (cursor) params.set('cursor', cursor);
      const page = await api(`/r2/buckets/${bucket}/objects?${params}`);
      objects.push(...page.result);
      const info = page.result_info;
      if (info?.is_truncated && (!info.cursor || seen.has(info.cursor))) throw Error('Incomplete pagination.');
      cursor = info?.is_truncated ? info.cursor : undefined;
      if (cursor) seen.add(cursor);
      console.error(`Inventoried ${objects.length} objects`);
    } while (cursor);
    const groups = selectRetiredBuilds(objects, activeBuilds);
    const plan = { account, bucket, createdAt: new Date().toISOString(), deploymentId: deployment.id, activeBuilds, lifecycle, lifecycleHash: digest(lifecycle), groups };
    writeFileSync(file, JSON.stringify(plan, null, 2) + '\n');
    const retired = groups.filter(g => g.retire);
    console.log(JSON.stringify({ builds: groups.length, retireBuilds: retired.length, retireObjects: retired.reduce((s,g)=>s+g.count,0), retireBytes: retired.reduce((s,g)=>s+g.bytes,0), retainedBytes: groups.filter(g=>!g.retire).reduce((s,g)=>s+g.bytes,0) }));
  } else {
    const plan = JSON.parse(readFileSync(file, 'utf8'));
    if (plan.account !== account || plan.bucket !== bucket || plan.deploymentId !== deployment.id || digest(plan.activeBuilds) !== digest(activeBuilds) || plan.lifecycleHash !== digest(lifecycle) || Date.now() - Date.parse(plan.createdAt) > 3600000) throw Error('Plan is stale or state changed; create a new plan.');
    const cutoff = Date.now() - 30 * 86400000;
    const reserved = new Set([...activeBuilds, ...[...plan.groups].sort((a,b)=>b.first-a.first).slice(0,3).map(g=>g.buildId)]);
    const retired = plan.groups.filter(g => g.retire);
    for (const g of retired) {
      if (!/^[A-Za-z0-9_-]{21}$/.test(g.buildId) || g.prefix !== `incremental-cache/${g.buildId}/` || reserved.has(g.buildId) || !(g.last < cutoff)) throw Error('Unsafe retirement prefix.');
      // A fresh write means this build may still be used. Fail closed before PUT.
      const query = new URLSearchParams({ prefix: g.prefix, per_page: '1000' });
      // Re-inventory is required for all pages, not only the first 1,000 keys.
      let cursor;
      do {
        if (cursor) query.set('cursor', cursor);
        const page = await api(`/r2/buckets/${bucket}/objects?${query}`);
        if (page.result.some(o => Date.parse(o.last_modified) >= cutoff)) throw Error('Retired build was recently written.');
        if (page.result_info?.is_truncated && !page.result_info.cursor) throw Error('Incomplete pagination.');
        cursor = page.result_info?.is_truncated ? page.result_info.cursor : undefined;
      } while (cursor);
    }
    if (digest((await api('/workers/scripts/dokorun/deployments')).result.deployments[0]) !== digest(deployment)) throw Error('Deployment changed during validation.');
    const rules = [...(lifecycle.rules ?? [])];
    for (const g of retired) {
      const id = `retired-build-${g.buildId}`;
      if (!rules.some(rule => rule.id === id)) rules.push({ id, enabled: true, conditions: { prefix: g.prefix }, deleteObjectsTransition: { condition: { type: 'Age', maxAge: 30 * 86400 } } });
    }
    await api(lifecyclePath, { method: 'PUT', body: JSON.stringify({ rules }) });
    const actual = (await api(lifecyclePath)).result;
    for (const expected of rules) if (!actual.rules.some(rule => digest(rule) === digest(expected))) throw Error('Lifecycle read-back mismatch.');
    writeFileSync(file + '.applied.json', JSON.stringify({ appliedAt: new Date().toISOString(), deploymentId: deployment.id, rules: actual.rules, status: 'Lifecycle rules active; object deletion is asynchronous.' }, null, 2) + '\n');
    console.log(`Verified ${retired.length} retired-build expiry rules. Deletion is asynchronous.`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
