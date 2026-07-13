import { spawnSync } from "node:child_process";

const [stableVersion, newVersion, newPercentageRaw, ...messageParts] = process.argv.slice(2);
const newPercentage = Number(newPercentageRaw);

if (!stableVersion || !newVersion || !Number.isInteger(newPercentage) || newPercentage < 0 || newPercentage > 100) {
  console.error("Usage: node scripts/release.mjs <stable-version-id> <new-version-id> <0-100> [message]");
  process.exit(1);
}

const stablePercentage = 100 - newPercentage;
const message = messageParts.join(" ") || `canary: ${newVersion} at ${newPercentage}%`;
const specs = newPercentage === 100
  ? [`${newVersion}@100%`]
  : [`${stableVersion}@${stablePercentage}%`, `${newVersion}@${newPercentage}%`];

const result = spawnSync("npx", ["wrangler", "versions", "deploy", ...specs, "--message", message, "-y"], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
