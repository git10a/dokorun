import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import * as schema from "@/db/schema";
import type { Database } from "@/db";
import { loginCallbackURL, loginDestination } from "@/lib/login-destination";

vi.mock("@/db", () => ({ getDb: vi.fn() }));
const origin = "https://dokorun.com";
const destination = "/races/iwaki-sunshine-marathon#write-review";

describe("Google login from the review form", () => {
  let client: Client;
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("BETTER_AUTH_SECRET", "callback-test-secret-32-characters-long");
    vi.stubEnv("BETTER_AUTH_URL", origin);
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
    client = createClient({ url: ":memory:" });
    await client.executeMultiple(readFileSync("drizzle/0000_init.sql", "utf8"));
  });
  afterEach(() => { client.close(); vi.unstubAllEnvs(); });

  async function signIn(callbackURL: string, requestOrigin = origin) {
    const { buildAuth } = await import("@/lib/better-auth");
    const auth = buildAuth(drizzle(client, { schema }) as unknown as Database);
    return auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Origin: requestOrigin,
        Cookie: "dokorun.callback-test=1",
        "Sec-Fetch-Site": requestOrigin === origin ? "same-origin" : "cross-site",
        "Sec-Fetch-Mode": "cors",
      },
      body: JSON.stringify({ provider: "google", callbackURL, disableRedirect: true }),
    }));
  }

  it("reproduces the relative-anchor failure and accepts the same-origin absolute callback", async () => {
    const previous = await signIn(destination);
    expect(previous.status).toBe(403);
    expect(await previous.json()).toMatchObject({ code: "INVALID_CALLBACK_URL" });
    const callback = loginCallbackURL(destination, origin);
    expect(callback).toBe(`${origin}${destination}`);
    const response = await signIn(callback);
    expect(response.status).toBe(200);
    const body = await response.json() as { url: string };
    expect(new URL(body.url).hostname).toBe("accounts.google.com");
  });

  it("keeps cross-site requests and external callbacks blocked", async () => {
    expect((await signIn(loginCallbackURL(destination, origin), "https://evil.example")).status).toBe(403);
    expect((await signIn("https://evil.example/")).status).toBe(403);
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/\n/evil.example"])(
    "normalizes unsafe login destinations: %s", (value) => {
      expect(loginDestination(value)).toBe("/me");
      expect(loginCallbackURL(value, origin)).toBe(`${origin}/me`);
    },
  );
});
