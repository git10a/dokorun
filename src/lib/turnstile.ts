const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

export async function verifyTurnstileToken({
  token,
  secretKey,
  remoteIp,
  expectedAction,
  allowedHostnames,
}: {
  token: string;
  secretKey: string;
  remoteIp?: string;
  expectedAction?: string;
  allowedHostnames?: string[];
}) {
  if (!token || token.length > 2048 || !secretKey) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return false;
    const result = await response.json() as TurnstileResponse;
    if (!result.success) return false;
    if (expectedAction && result.action !== expectedAction) return false;
    if (allowedHostnames?.length && (!result.hostname || !allowedHostnames.includes(result.hostname))) return false;
    return true;
  } catch {
    return false;
  }
}
