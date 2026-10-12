// Google is used only to identify the user, never to call Google APIs later.
export const discardedProviderCredentials = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  scope: null,
};
export function privateProfileDefaults() {
  return {
    name: "ランナー",
    image: null,
    handle: `runner-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
    bio: null,
  };
}
export function authSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("Authentication secret is not configured");
  return "dokorun-local-development-secret-change-me";
}
