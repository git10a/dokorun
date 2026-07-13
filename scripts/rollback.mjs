import { spawnSync } from "node:child_process";

const [stableVersion, ...reasonParts] = process.argv.slice(2);
if (!stableVersion) {
  console.error("Usage: node scripts/rollback.mjs <stable-version-id> [reason]");
  process.exit(1);
}

const reason = reasonParts.join(" ") || `rollback to ${stableVersion}`;
const result = spawnSync("npx", ["wrangler", "rollback", stableVersion, "--message", reason, "-y"], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
