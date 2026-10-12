import { analyticsEventNames, analyticsPath, sanitizeAnalyticsMeta } from "../src/lib/analytics-privacy.ts";
const DAY = 86400000;
const eventNames = [...analyticsEventNames].map((name) => `'${name}'`).join(",");

export async function retainData(env, now = Date.now()) {
  const cutoff = now - 30 * DAY;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO event_daily_counts(day,name,count) SELECT strftime('%Y-%m-%d',(created_at+32400000)/1000,'unixepoch'), name, count(*) FROM events WHERE created_at < ? AND name IN (${eventNames}) GROUP BY 1,2 ON CONFLICT(day,name) DO UPDATE SET count = event_daily_counts.count + excluded.count`,
    ).bind(cutoff),
    env.DB.prepare("DELETE FROM events WHERE created_at < ?").bind(cutoff),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("DELETE FROM verifications WHERE expires_at < ?").bind(now),
    env.DB.prepare("DELETE FROM feedback WHERE created_at < ?").bind(now - 180 * DAY),
  ]);
  // Credentials are only needed while completing Google sign-in, not afterwards.
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE accounts SET access_token=NULL, refresh_token=NULL, id_token=NULL, access_token_expires_at=NULL, refresh_token_expires_at=NULL, scope=NULL WHERE provider_id='google' AND (access_token IS NOT NULL OR refresh_token IS NOT NULL OR id_token IS NOT NULL OR scope IS NOT NULL)",
    ),
    env.DB.prepare(
      "UPDATE sessions SET ip_address=NULL, user_agent=NULL WHERE ip_address IS NOT NULL OR user_agent IS NOT NULL",
    ),
  ]);
  return { retainedDays: 30 };
}

export async function deleteQueuedPhotos(env) {
  const { results } = await env.DB.prepare("SELECT key FROM photo_deletions ORDER BY created_at LIMIT 100").all();
  if (!results.length) return { deleted: 0, pending: 0 };
  const keys = results.map(({ key }) => key);
  const placeholders = keys.map(() => "?").join(",");
  const refs = await env.DB.prepare(`SELECT key FROM run_photos WHERE key IN (${placeholders})`)
    .bind(...keys)
    .all();
  const referenced = new Set(refs.results.map(({ key }) => key));
  const removable = keys.filter((key) => !referenced.has(key));
  if (removable.length) {
    await env.PRIVATE_IMAGE_BUCKET.delete(removable);
    await env.IMAGE_BUCKET.delete(removable);
  }
  await env.DB.prepare(`DELETE FROM photo_deletions WHERE key IN (${placeholders})`)
    .bind(...keys)
    .run();
  return {
    deleted: removable.length,
    pending: Number((await env.DB.prepare("SELECT count(*) AS n FROM photo_deletions").first()).n),
  };
}

export async function sweepOrphanPhotos(env, now = Date.now()) {
  const saved = await env.DB.prepare("SELECT value FROM privacy_maintenance WHERE id='orphan_cursor'").first();
  const page = await env.PRIVATE_IMAGE_BUCKET.list({ prefix: "runs/", limit: 100, cursor: saved?.value || undefined });
  // Allow at least a day for an in-flight upload/DB operation to finish.
  const candidates = page.objects.filter((item) => new Date(item.uploaded).getTime() < now - DAY).map(({ key }) => key);
  if (candidates.length) {
    const refs = await env.DB.prepare(
      `SELECT key FROM run_photos WHERE key IN (${candidates.map(() => "?").join(",")})`,
    )
      .bind(...candidates)
      .all();
    const referenced = new Set(refs.results.map(({ key }) => key));
    const removable = candidates.filter((key) => !referenced.has(key));
    if (removable.length) await env.PRIVATE_IMAGE_BUCKET.delete(removable);
  }
  await env.DB.prepare(
    "INSERT INTO privacy_maintenance(id,value) VALUES ('orphan_cursor',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
  )
    .bind(page.truncated ? page.cursor : "")
    .run();
}

export async function migratePhotos(env) {
  // Re-read first page after each batch, since processed public objects are deleted.
  const page = await env.IMAGE_BUCKET.list({ prefix: "runs/", limit: 5 });
  let moved = 0,
    orphaned = 0;
  for (const item of page.objects) {
    const reference = await env.DB.prepare("SELECT 1 AS found FROM run_photos WHERE key = ?").bind(item.key).first();
    if (reference) {
      const source = await env.IMAGE_BUCKET.get(item.key);
      if (!source) continue;
      const existing = await env.PRIVATE_IMAGE_BUCKET.head(item.key);
      if (!existing)
        await env.PRIVATE_IMAGE_BUCKET.put(item.key, source.body, {
          httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
        });
      const copied = await env.PRIVATE_IMAGE_BUCKET.head(item.key);
      if (!copied || copied.size !== source.size || copied.etag !== source.etag)
        throw new Error("photo_copy_verification_failed");
      moved++;
    } else orphaned++;
    await env.IMAGE_BUCKET.delete(item.key);
  }
  const remaining = await env.IMAGE_BUCKET.list({ prefix: "runs/", limit: 1 });
  return { moved, orphaned, remaining: remaining.objects.length > 0 };
}

export async function sanitizeLegacyEvents(env, after = "") {
  const { results } = await env.DB.prepare("SELECT id, name, path, meta FROM events WHERE id > ? ORDER BY id LIMIT 200")
    .bind(after)
    .all();
  if (results.length)
    await env.DB.batch(
      results.map((row) => {
        if (!analyticsEventNames.has(row.name)) return env.DB.prepare("DELETE FROM events WHERE id = ?").bind(row.id);
        let meta = {};
        try {
          meta = sanitizeAnalyticsMeta(JSON.parse(row.meta));
        } catch {
          /* no raw data retained */
        }
        return env.DB.prepare("UPDATE events SET path=?, meta=? WHERE id=?").bind(
          analyticsPath(row.path),
          JSON.stringify(meta),
          row.id,
        );
      }),
    );
  return { processed: results.length, after: results.at(-1)?.id ?? after, done: results.length < 200 };
}

export async function status(env) {
  const [totals, queue, legacy] = await Promise.all([
    env.DB.prepare(
      "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM run_photos) AS photos, (SELECT count(*) FROM accounts WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL OR id_token IS NOT NULL) AS stored_provider_tokens, (SELECT count(*) FROM sessions WHERE ip_address IS NOT NULL OR user_agent IS NOT NULL) AS identifying_sessions, (SELECT count(*) FROM events WHERE created_at < ?) AS expired_events, (SELECT count(*) FROM event_daily_counts) AS aggregate_rows",
    )
      .bind(Date.now() - 30 * DAY)
      .first(),
    env.DB.prepare("SELECT count(*) AS n FROM photo_deletions").first(),
    env.IMAGE_BUCKET.list({ prefix: "runs/", limit: 1 }),
  ]);
  return { ...totals, pending_photo_deletions: queue.n, legacy_photos_remaining: legacy.objects.length > 0 };
}

export async function runMaintenance(env) {
  await retainData(env);
  const cleanup = await deleteQueuedPhotos(env);
  await sweepOrphanPhotos(env);
  await env.DB.prepare(
    "INSERT INTO privacy_maintenance(id,value) VALUES ('last_success',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
  )
    .bind(String(Date.now()))
    .run();
  return cleanup;
}

async function verifyPhotoAccess(env, version) {
  const id = crypto.randomUUID(),
    photoId = crypto.randomUUID();
  const key = `runs/${id}/${photoId}.webp`;
  const headers =
    version && /^[a-f0-9-]{36}$/.test(version)
      ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${version}"` }
      : {};
  const probe = (path) =>
    fetch(`https://dokorun.com${path}`, { headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
  let publicStatus, privateStatus, deletedStatus, noStore;
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users(id,name,email,handle) VALUES (?,'Privacy check',?,?)").bind(
        id,
        `${id}@example.invalid`,
        `check-${id}`,
      ),
      env.DB.prepare(
        "INSERT INTO spots(id,slug,name,name_kana,prefecture,city,lat,lng,description,is_published) VALUES (?,?,'Privacy check','test','東京都','千代田区',35,139,'Synthetic test',0)",
      ).bind(id, `privacy-check-${id}`),
      env.DB.prepare("INSERT INTO runs(id,user_id,spot_id,ran_at,visibility) VALUES (?,?,?,0,'public')").bind(
        id,
        id,
        id,
      ),
      env.DB.prepare("INSERT INTO run_photos(id,run_id,key) VALUES (?,?,?)").bind(photoId, id, key),
    ]);
    await env.PRIVATE_IMAGE_BUCKET.put(key, new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]));
    const visible = await probe(`/api/run-photos/${key}`);
    publicStatus = visible.status;
    noStore = visible.headers.get("Cache-Control")?.includes("no-store");
    await visible.body?.cancel();
    await env.DB.prepare("UPDATE runs SET visibility='private' WHERE id=?").bind(id).run();
    const hidden = await probe(`/api/run-photos/${key}`);
    privateStatus = hidden.status;
    await hidden.body?.cancel();
    await env.DB.prepare("DELETE FROM users WHERE id=?").bind(id).run();
    const removed = await probe(`/api/run-photos/${key}`);
    deletedStatus = removed.status;
    await removed.body?.cancel();
  } finally {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM users WHERE id=?").bind(id),
      env.DB.prepare("DELETE FROM spots WHERE id=?").bind(id),
    ]);
    await env.PRIVATE_IMAGE_BUCKET.delete(key);
    await env.DB.prepare("DELETE FROM photo_deletions WHERE key=?").bind(key).run();
  }
  const { results } = await env.DB.prepare(
    "SELECT p.key,r.visibility FROM run_photos p JOIN runs r ON p.run_id=r.id LIMIT 10",
  ).all();
  const existing = [];
  for (const photo of results) {
    const current = await probe(`/api/run-photos/${photo.key}`);
    const legacy = await fetch(`https://pub-c598f7bd37324d98a1771a87633f82d0.r2.dev/${photo.key}`, {
      signal: AbortSignal.timeout(15000),
    });
    existing.push({
      current: current.status,
      expected: photo.visibility === "public" ? 200 : 404,
      legacy: legacy.status,
    });
    await current.body?.cancel();
    await legacy.body?.cancel();
  }
  return { publicStatus, privateStatus, deletedStatus, noStore, existing };
}

async function authorized(request, env) {
  if (!env.MAINTENANCE_SECRET || !request.headers.get("Authorization")) return false;
  const digest = (value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [a, b] = await Promise.all([
    digest(request.headers.get("Authorization")),
    digest(`Bearer ${env.MAINTENANCE_SECRET}`),
  ]);
  let difference = 0;
  const aa = new Uint8Array(a),
    bb = new Uint8Array(b);
  for (let i = 0; i < aa.length; i++) difference |= aa[i] ^ bb[i];
  return difference === 0;
}
const worker = {
  async fetch(request, env) {
    if (request.method !== "POST" || !(await authorized(request, env))) return new Response(null, { status: 404 });
    try {
      const body = await request.json();
      const result =
        body.action === "status"
          ? await status(env)
          : body.action === "run"
            ? await runMaintenance(env)
            : body.action === "verify"
              ? await verifyPhotoAccess(env, body.version)
              : body.action === "retention"
                ? await retainData(env)
                : body.action === "photos"
                  ? await migratePhotos(env)
                  : body.action === "cleanup"
                    ? await deleteQueuedPhotos(env)
                    : body.action === "sanitize"
                      ? await sanitizeLegacyEvents(env, typeof body.after === "string" ? body.after : "")
                      : null;
      return Response.json(result, { status: result ? 200 : 400, headers: { "Cache-Control": "no-store" } });
    } catch {
      return Response.json({ error: "maintenance_failed" }, { status: 500 });
    }
  },
  async scheduled(_controller, env) {
    try {
      await runMaintenance(env);
    } catch {
      console.error("privacy_maintenance_failed");
      throw new Error("privacy_maintenance_failed");
    }
  },
};

export default worker;
