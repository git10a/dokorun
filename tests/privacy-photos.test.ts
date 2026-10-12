import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import * as schema from "@/db/schema";
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getUser: vi.fn(), privateGet: vi.fn(), publicGet: vi.fn() }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/user", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/run-photo-storage", () => ({
  photoBuckets: () => ({ PRIVATE_IMAGE_BUCKET: { get: mocks.privateGet }, IMAGE_BUCKET: { get: mocks.publicGet } }),
}));
import { GET } from "@/app/api/run-photos/[...key]/route";
const key = "runs/12345678-1234-1234-1234-123456789012/12345678-1234-1234-1234-123456789012.webp";
const get = () =>
  GET(new Request(`https://dokorun.com/api/run-photos/${key}`), { params: Promise.resolve({ key: key.split("/") }) });

describe("photo authorization on every request", () => {
  let client: Client;
  beforeEach(async () => {
    vi.resetAllMocks();
    client = createClient({ url: ":memory:" });
    await client.executeMultiple(readFileSync("drizzle/0000_init.sql", "utf8"));
    await client.execute(
      "INSERT INTO users(id,name,email,handle) VALUES ('owner','Runner','test@example.com','runner')",
    );
    await client.execute(
      "INSERT INTO spots(id,slug,name,name_kana,prefecture,city,lat,lng,description) VALUES ('s','s','s','s','東京都','千代田区',35,139,'s')",
    );
    await client.execute("INSERT INTO runs(id,user_id,spot_id,ran_at,visibility) VALUES ('r','owner','s',0,'private')");
    await client.execute({ sql: "INSERT INTO run_photos(id,run_id,key) VALUES ('p','r',?)", args: [key] });
    mocks.getDb.mockReturnValue(drizzle(client, { schema }));
    mocks.privateGet.mockResolvedValue({ body: new Uint8Array([1, 2, 3]) });
  });
  afterEach(() => client.close());
  it("denies anonymous and other users before touching storage", async () => {
    for (const user of [null, { id: "other" }]) {
      mocks.getUser.mockResolvedValue(user);
      expect((await get()).status).toBe(404);
    }
    expect(mocks.privateGet).not.toHaveBeenCalled();
    expect(mocks.publicGet).not.toHaveBeenCalled();
  });
  it("serves owner with no-store and revokes previous public URLs after changing visibility", async () => {
    mocks.getUser.mockResolvedValue({ id: "owner" });
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await client.execute("UPDATE runs SET visibility='public'");
    mocks.getUser.mockResolvedValue(null);
    expect((await get()).status).toBe(200);
    await client.execute("UPDATE runs SET visibility='private'");
    expect((await get()).status).toBe(404);
    await client.execute("DELETE FROM run_photos");
    mocks.getUser.mockResolvedValue({ id: "owner" });
    expect((await get()).status).toBe(404);
  });
});
