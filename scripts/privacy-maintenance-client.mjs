// One-time operational client. The Worker is disabled on workers.dev after migration.
import { readFileSync } from "node:fs";
const secret = readFileSync("/private/tmp/dokorun-privacy-maintenance.secret", "utf8");
const base = "https://dokorun-privacy-maintenance.hinode-run.workers.dev";
async function run(body) {
  const response = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) throw Error(`Maintenance failed (${response.status})`);
  return result;
}
const action = process.argv[2] || "status";
if (action === "sanitize-all") {
  let after = "",
    processed = 0;
  for (let page = 0; page < 1000; page++) {
    const result = await run({ action: "sanitize", after });
    processed += result.processed;
    after = result.after;
    if (result.done) {
      console.log(JSON.stringify({ sanitized: processed }));
      break;
    }
    if (page % 10 === 0) console.log(JSON.stringify({ sanitized: processed, continuing: true }));
    if (page === 999) throw Error("Sanitization incomplete");
  }
} else if (action === "photos-all") {
  let moved = 0,
    orphaned = 0;
  for (let page = 0; page < 1000; page++) {
    const result = await run({ action: "photos" });
    moved += result.moved;
    orphaned += result.orphaned;
    if (!result.remaining) {
      console.log(JSON.stringify({ moved, orphaned, remaining: false }));
      break;
    }
    if (page === 999) throw Error("Photo migration incomplete");
  }
} else console.log(JSON.stringify(await run({ action, version: process.argv[3] })));
