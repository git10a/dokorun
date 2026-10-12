// Keeps authentication material out of command arguments, logs, and exported data.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
export const cloudflareAccount = 'cd288c7e5f37d2adce330bd0aab52f6f';
export async function cfApi(path, options = {}) {
  const config = process.env.CLOUDFLARE_API_TOKEN ? '' : readFileSync(`${homedir()}/Library/Preferences/.wrangler/config/default.toml`, 'utf8');
  const token = process.env.CLOUDFLARE_API_TOKEN || config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if (!token) throw new Error('Cloudflare login required');
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { signal: AbortSignal.timeout(20000), ...options, headers: { Authorization: `Bearer ${token}`, ...options.headers } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(`Cloudflare operation failed (${response.status})`);
  return result.result;
}

export async function enforcePrivateRequestLogs() {
  const observability = {
    enabled: true, head_sampling_rate: 1, redact_query_string: true,
    logs: { enabled: true, head_sampling_rate: 1, invocation_logs: false },
    traces: { enabled: false, head_sampling_rate: 0.05 },
  };
  await cfApi(`/accounts/${cloudflareAccount}/workers/scripts/dokorun/script-settings`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observability }),
  });
  const settings = await cfApi(`/accounts/${cloudflareAccount}/workers/scripts/dokorun/settings`);
  if (!settings.observability?.redact_query_string || settings.observability?.logs?.invocation_logs || settings.observability?.traces?.enabled) throw new Error('Privacy log settings were not applied');
  console.log('Request URL query redaction verified; invocation logs and traces disabled');
}
