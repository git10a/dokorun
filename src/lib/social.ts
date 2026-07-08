export type SocialService = "instagram" | "x" | "strava";

const patterns: Record<SocialService, RegExp> = {
  instagram: /^[a-zA-Z0-9._]{1,30}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  strava: /^[a-zA-Z0-9_-]{1,64}$/,
};

function stripUrl(value: string, hosts: string[]) {
  let input = value.trim();
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    if (hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      input = url.pathname.split("/").filter(Boolean).join("/");
    }
  } catch {
    // Treat non-URL values as raw handles.
  }
  return input.replace(/^@+/, "").split(/[?#]/)[0] ?? "";
}

export function normalizeInstagram(value: string) {
  const stripped = stripUrl(value, ["instagram.com"]);
  if (stripped.includes("/")) return null;
  const name = stripped.split("/")[0] ?? "";
  return patterns.instagram.test(name) ? name : null;
}

export function normalizeXHandle(value: string) {
  const stripped = stripUrl(value, ["x.com", "twitter.com"]);
  if (stripped.includes("/")) return null;
  const name = stripped.split("/")[0] ?? "";
  return patterns.x.test(name) ? name : null;
}

export function normalizeStrava(value: string) {
  const raw = value.trim();
  const isStravaUrl = /^(https?:\/\/)?([^/]+\.)?strava\.com\//i.test(raw);
  const stripped = stripUrl(value, ["strava.com"]);
  if (!isStravaUrl && stripped.includes("/")) return null;
  const parts = stripped.split("/").filter(Boolean);
  const name = parts[0] === "athletes" ? parts[1] ?? "" : parts[0] ?? "";
  return patterns.strava.test(name) ? name : null;
}

export function socialUrl(service: SocialService, value: string) {
  if (service === "instagram") return `https://www.instagram.com/${value}`;
  if (service === "x") return `https://x.com/${value}`;
  return `https://www.strava.com/athletes/${value}`;
}
