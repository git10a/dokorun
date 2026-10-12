import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import * as schema from "@/db/schema";
import { buildAuth } from "@/lib/better-auth";
import type { Database } from "@/db";

vi.mock("@/db", () => ({ getDb: vi.fn() }));
const secret = "privacy-test-secret-32-characters-long";
const base = "http://localhost:3000";
const cookie = (token: string) =>
  `dokorun.session_token=${encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`)}`;

describe("real Better Auth adapter privacy and deletion", () => {
  let client: Client;
  beforeEach(async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", secret);
    vi.stubEnv("BETTER_AUTH_URL", base);
    client = createClient({ url: ":memory:" });
    await client.executeMultiple(readFileSync("drizzle/0000_init.sql", "utf8"));
    await client.executeMultiple(readFileSync("scripts/sql/2026-10-12-privacy.sql", "utf8"));
    await client.execute("PRAGMA foreign_keys=ON");
  });
  afterEach(() => {
    client.close();
    vi.unstubAllEnvs();
  });
  const authDb = (client: Client) => drizzle(client, { schema }) as unknown as Database;
  async function register() {
    const auth = buildAuth(authDb(client));
    const ctx = await auth.$context;
    const result = await ctx.internalAdapter.createOAuthUser(
      {
        name: "Google Real Name",
        image: "https://example.com/face.jpg",
        email: "private@example.com",
        emailVerified: true,
      },
      {
        providerId: "google",
        accountId: "google-stable-subject",
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
        idToken: "secret-id",
      },
    );
    return { auth, ctx, ...result };
  }
  it("keeps Google identity for sign-in but discards provider credentials and real-name defaults", async () => {
    const { ctx, user, account } = await register();
    expect(user.name).toBe("ランナー");
    expect(user.image).toBeNull();
    const stored = (await client.execute("SELECT * FROM users")).rows[0];
    expect(stored.handle).toMatch(/^runner-[a-f0-9]{20}$/);
    expect(stored.email).toBe("private@example.com");
    let row = (await client.execute("SELECT * FROM accounts")).rows[0];
    expect(row.account_id).toBe("google-stable-subject");
    expect(row.access_token).toBeNull();
    expect(row.refresh_token).toBeNull();
    expect(row.id_token).toBeNull();
    await ctx.internalAdapter.updateAccount(account.id, { accessToken: "new-secret", idToken: "new-id" });
    row = (await client.execute("SELECT * FROM accounts")).rows[0];
    expect(row.access_token).toBeNull();
    expect(row.id_token).toBeNull();
    const found = await ctx.internalAdapter.findOAuthUser("private@example.com", "google-stable-subject", "google");
    expect(found?.user.id).toBe(user.id);
    const session = await ctx.internalAdapter.createSession(user.id, false, {
      ipAddress: "1.2.3.4",
      userAgent: "fingerprint",
    });
    expect(session?.ipAddress).toBeNull();
    expect(session?.userAgent).toBeNull();
  });
  it("revokes a deleted user's signed session immediately and queues photo removal", async () => {
    const { auth, ctx, user } = await register();
    await client.execute(
      "INSERT INTO spots(id,slug,name,name_kana,prefecture,city,lat,lng,description) VALUES ('s','s','s','s','東京都','千代田区',35,139,'s')",
    );
    await client.execute({
      sql: "INSERT INTO runs(id,user_id,spot_id,ran_at,visibility) VALUES ('r',?,'s',0,'private')",
      args: [user.id],
    });
    await client.execute("INSERT INTO run_photos(id,run_id,key) VALUES ('p','r','runs/test.webp')");
    const session = await ctx.internalAdapter.createSession(user.id);
    const headers = { cookie: cookie(session!.token), origin: base, "Content-Type": "application/json" };
    const before = await auth.api.getSession({ headers: new Headers(headers) });
    expect(before?.user.id).toBe(user.id);
    const response = await auth.handler(
      new Request(`${base}/api/auth/delete-user`, { method: "POST", headers, body: "{}" }),
    );
    expect(response.status, await response.clone().text()).toBe(200);
    expect((await client.execute("SELECT count(*) AS n FROM users")).rows[0].n).toBe(0);
    expect((await client.execute("SELECT count(*) AS n FROM runs")).rows[0].n).toBe(0);
    expect((await client.execute("SELECT count(*) AS n FROM photo_deletions")).rows[0].n).toBe(1);
    expect(await auth.api.getSession({ headers: new Headers(headers) })).toBeNull();
  });
  it("rejects cross-site and stale-session account deletion", async () => {
    const { auth, ctx, user } = await register();
    const session = await ctx.internalAdapter.createSession(user.id);
    const headers = {
      cookie: cookie(session!.token),
      origin: "https://evil.example",
      "Content-Type": "application/json",
    };
    expect(
      (await auth.handler(new Request(`${base}/api/auth/delete-user`, { method: "POST", headers, body: "{}" }))).status,
    ).toBe(403);
    await client.execute({ sql: "UPDATE sessions SET created_at=?", args: [Date.now() - 10 * 60 * 1000] });
    headers.origin = base;
    const response = await auth.handler(
      new Request(`${base}/api/auth/delete-user`, { method: "POST", headers, body: "{}" }),
    );
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe("SESSION_EXPIRED");
    expect((await client.execute("SELECT count(*) AS n FROM users")).rows[0].n).toBe(1);
  });
});
