import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const sourceDir = resolve("data/gpx");
const targetDir = resolve("public/spot-gpx");
const entries = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".gpx"))
  .sort((a, b) => a.name.localeCompare(b.name));

if (!entries.length) throw new Error(`No GPX files found in ${sourceDir}`);

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const entry of entries) {
  if (!/^[a-z0-9-]+\.gpx$/.test(entry.name)) throw new Error(`Invalid GPX filename: ${entry.name}`);
  const source = resolve(sourceDir, entry.name);
  const prefix = (await readFile(source, "utf8")).slice(0, 500);
  if (!prefix.includes("<gpx")) throw new Error(`Invalid GPX document: ${entry.name}`);
  await cp(source, resolve(targetDir, entry.name));
}

console.log(`Synced ${entries.length} spot GPX files to public/spot-gpx`);
