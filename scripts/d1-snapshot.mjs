// Build catalog snapshot: never export accounts, sessions, posts, events, or contacts.
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { fillPublicSnapshot } from "./public-snapshot.mjs";

const out = resolve(process.argv[2] ?? ".d1-build/prod.sqlite");
const staging = `${out}.next`;
mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
rmSync(staging, { force: true });
const client = createClient({ url: `file:${staging}` });
try {
  const count = await fillPublicSnapshot(client, async (sql) => {
    const output = execFileSync(
      "npx",
      ["wrangler", "d1", "execute", "dokorun-db", "--remote", "--json", "--command", sql],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    );
    const results = JSON.parse(output);
    if (!results[0]?.success) throw new Error("Public catalog query failed");
    return results[0].results;
  });
  if (count < 100) throw new Error("Public catalog is unexpectedly small");
  client.close();
  chmodSync(staging, 0o600);
  renameSync(staging, out);
  // The previous generator left a full SQL dump next to this exact build artifact.
  rmSync(out.replace(/\.sqlite$/, ".sql"), { force: true });
  console.log(`Public-only snapshot ready (${count} spots; no user rows)`);
} catch {
  client.close();
  rmSync(staging, { force: true });
  console.error("Build stopped: public catalog snapshot failed. No full export fallback is allowed.");
  process.exitCode = 1;
}
