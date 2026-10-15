import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Retain both builds' immutable Next assets while traffic changes versions.
// Only _next/static is merged: mutable public data stays with its own build.
export function mergeReleaseStaticAssets(sourceAssets, targetAssets) {
  const source = resolve(sourceAssets, "_next/static");
  const target = resolve(targetAssets, "_next/static");
  if (source === target) throw new Error("Source and target must be different builds");
  const files = [];
  function collect(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(prefix, entry.name);
      if (entry.isDirectory()) collect(join(directory, entry.name), path);
      else if (entry.isFile()) files.push(path);
      else throw new Error(`Unsupported static asset: ${path}`);
    }
  }
  collect(source);
  if (files.length === 0) throw new Error("Source build has no static assets");
  const manifest = files.sort().map((path) => {
    const bytes = readFileSync(join(source, path));
    const destination = join(target, path);
    const present = existsSync(destination);
    if (present && !bytes.equals(readFileSync(destination))) {
      throw new Error(`Static asset path has different content: ${path}`);
    }
    return { path, sha256: createHash("sha256").update(bytes).digest("hex"), present };
  });
  // Validate every collision before writing any file; never replace a build's assets.
  for (const { path, present } of manifest) {
    if (present) continue;
    const destination = join(target, path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(source, path), destination, constants.COPYFILE_EXCL);
  }
  return { source, target, added: manifest.filter((file) => !file.present).length, files: manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, target] = process.argv.slice(2);
  if (!source || !target)
    throw new Error("Usage: node scripts/merge-release-static-assets.mjs <source-assets> <target-assets>");
  console.log(JSON.stringify(mergeReleaseStaticAssets(source, target), null, 2));
}
