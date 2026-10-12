import { test } from "vitest";
import assert from "node:assert/strict";
import { fixtureDb, seedSpot, d1Client } from "../scripts/privacy-test-helpers.mjs";
import {
  retainData,
  deleteQueuedPhotos,
  migratePhotos,
  sanitizeLegacyEvents,
} from "../workers/privacy-maintenance.mjs";

test("retention aggregates once, removes expired records and provider credentials, preserves active sign-in", async () => {
  const client = await fixtureDb();
  try {
    const now = Date.now(),
      day = 86400000;
    await client.execute("INSERT INTO users(id,name,email,handle) VALUES ('u','Runner','test@example.com','runner')");
    await client.execute({
      sql: "INSERT INTO sessions(id,user_id,token,expires_at,ip_address,user_agent) VALUES ('active','u','valid-token',?,'1.2.3.4','browser'),('old','u','expired-token',?,'1.2.3.4','browser')",
      args: [now + day, now - day],
    });
    await client.execute(
      "INSERT INTO accounts(id,user_id,account_id,provider_id,access_token,refresh_token,id_token) VALUES ('a','u','google-id','google','secret','secret2','secret3')",
    );
    for (const [id, created] of [
      ["old1", now - 40 * day],
      ["old2", now - 40 * day],
      ["new", now],
    ])
      await client.execute({
        sql: "INSERT INTO events(id,name,meta,created_at) VALUES (?,'gpx_download','{}',?)",
        args: [id, created],
      });
    await retainData({ DB: d1Client(client) }, now);
    await retainData({ DB: d1Client(client) }, now);
    assert.equal((await client.execute("SELECT sum(count) AS n FROM event_daily_counts")).rows[0].n, 2);
    assert.equal((await client.execute("SELECT count(*) AS n FROM events")).rows[0].n, 1);
    assert.deepEqual(
      { ...(await client.execute("SELECT token,ip_address,user_agent FROM sessions")).rows[0] },
      { token: "valid-token", ip_address: null, user_agent: null },
    );
    assert.equal((await client.execute("SELECT access_token FROM accounts")).rows[0].access_token, null);
  } finally {
    client.close();
  }
});
test("user cascade queues every photo; failed object deletion is retried without losing the key", async () => {
  const client = await fixtureDb();
  try {
    await seedSpot(client);
    await client.execute("INSERT INTO users(id,name,email,handle) VALUES ('u','Runner','test@example.com','runner')");
    await client.execute("INSERT INTO runs(id,user_id,spot_id,ran_at,visibility) VALUES ('r','u','spot',0,'private')");
    await client.execute("INSERT INTO run_photos(id,run_id,key) VALUES ('p','r','runs/photo.webp')");
    await client.execute("DELETE FROM users WHERE id='u'");
    const deleted = [];
    let fail = true;
    const env = {
      DB: d1Client(client),
      PRIVATE_IMAGE_BUCKET: {
        delete: async (key) => {
          if (fail) throw Error("temporary");
          deleted.push(...key);
        },
      },
      IMAGE_BUCKET: { delete: async () => {} },
    };
    await assert.rejects(deleteQueuedPhotos(env));
    assert.equal((await client.execute("SELECT count(*) AS n FROM photo_deletions")).rows[0].n, 1);
    fail = false;
    assert.equal((await deleteQueuedPhotos(env)).pending, 0);
    assert.deepEqual(deleted, ["runs/photo.webp"]);
  } finally {
    client.close();
  }
});
test("migration never deletes the public original when the private copy fails verification", async () => {
  let deleted = false;
  const env = {
    DB: { prepare: () => ({ bind: () => ({ first: async () => ({ found: 1 }) }) }) },
    IMAGE_BUCKET: {
      list: async () => ({ objects: [{ key: "runs/test.webp" }] }),
      get: async () => ({ size: 3, etag: "correct", body: "abc" }),
      delete: async () => {
        deleted = true;
      },
    },
    PRIVATE_IMAGE_BUCKET: { head: async () => ({ size: 3, etag: "wrong" }) },
  };
  await assert.rejects(migratePhotos(env));
  assert.equal(deleted, false);
});
test("existing telemetry is scrubbed without retaining search text, coordinates, contact or profile IDs", async () => {
  const client = await fixtureDb();
  try {
    await client.execute({
      sql: "INSERT INTO events(id,name,path,meta) VALUES ('e','search','/me/logs/private-id?lat=35.1234',?)",
      args: [JSON.stringify({ q: "my home address", lat: 35.1234, email: "private@example.com", hasQuery: true })],
    });
    await sanitizeLegacyEvents({ DB: d1Client(client) });
    const row = (await client.execute("SELECT path,meta FROM events")).rows[0];
    assert.equal(row.path, "/me");
    assert.deepEqual(JSON.parse(row.meta), { hasQuery: true });
  } finally {
    client.close();
  }
});
