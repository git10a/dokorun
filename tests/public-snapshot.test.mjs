import { test } from "vitest";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { fillPublicSnapshot, publicQuery } from "../scripts/public-snapshot.mjs";
import { fixtureDb, seedSpot } from "../scripts/privacy-test-helpers.mjs";

test("build snapshot excludes all people, secrets, private rows and raw events", async () => {
  const source = await fixtureDb(),
    target = createClient({ url: ":memory:" });
  try {
    await seedSpot(source);
    await source.execute(
      "INSERT INTO users(id,name,email,handle) VALUES ('user','REAL NAME','private@example.com','private')",
    );
    await source.execute(
      "INSERT INTO accounts(id,user_id,account_id,provider_id,access_token) VALUES ('account','user','google-id','google','TOP_SECRET')",
    );
    await source.execute(
      "INSERT INTO feedback(id,category,message,contact) VALUES ('feedback','contact','Private message','private@example.com')",
    );
    await source.execute("INSERT INTO hashiritai(client_id,user_id,spot_id) VALUES ('browser-id','user','spot')");
    const count = await fillPublicSnapshot(target, async (sql) => (await source.execute(sql)).rows);
    assert.equal(count, 1);
    for (const table of ["users", "accounts", "sessions", "events", "feedback", "runs", "hashiritai"])
      assert.equal((await target.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n, 0);
    assert.equal((await target.execute("SELECT count(*) AS n FROM courses")).rows[0].n, 1);
    assert.throws(() => publicQuery("users"));
    assert.throws(() => publicQuery("spots", -1));
  } finally {
    source.close();
    target.close();
  }
});
