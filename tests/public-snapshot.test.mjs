import { readFileSync } from "node:fs";
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
    await source.executeMultiple(readFileSync("scripts/sql/2026-11-12-articles.sql", "utf8"));
    await source.execute(`INSERT INTO articles(id,slug,title,body,description,status,published_at,preview_token) VALUES
      ('published','published','Public title','Public body','Public description','published',1,'SECRET_PUBLIC_TOKEN'),
      ('draft','draft','Private title','Private body','Private description','draft',1,'SECRET_DRAFT_TOKEN'),
      ('undated','undated','Undated title','Undated body','Undated description','published',NULL,'SECRET_UNDATED_TOKEN')`);
    await source.execute(
      "INSERT INTO users(id,name,email,handle) VALUES ('user','REAL NAME','private@example.com','private')",
    );
    await source.execute(
      "INSERT INTO accounts(id,user_id,account_id,provider_id,access_token) VALUES ('account','user','google-id','google','TOP_SECRET')",
    );
    await source.execute(
      "INSERT INTO feedback(id,category,message,contact) VALUES ('feedback','contact','Private message','private@example.com')",
    );
    const count = await fillPublicSnapshot(target, async (sql) => (await source.execute(sql)).rows);
    assert.equal(count, 1);
    const savedArticles = (await target.execute("SELECT slug,body,preview_token FROM articles")).rows;
    assert.equal(savedArticles.length, 1);
    assert.equal(savedArticles[0].slug, "published");
    assert.equal(savedArticles[0].body, "Public body");
    assert.equal(savedArticles[0].preview_token, "build-only:published");
    assert.ok(!publicQuery("articles").includes("preview_token"));
    for (const table of ["users", "accounts", "sessions", "events", "feedback", "runs"])
      assert.equal((await target.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n, 0);
    assert.equal((await target.execute("SELECT count(*) AS n FROM courses")).rows[0].n, 1);
    assert.throws(() => publicQuery("users"));
    assert.throws(() => publicQuery("spots", -1));
  } finally {
    source.close();
    target.close();
  }
});
