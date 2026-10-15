import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { mergeReleaseStaticAssets } from "../scripts/merge-release-static-assets.mjs";

const directories = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "release-assets-"));
  directories.push(root);
  const source = join(root, "source");
  const target = join(root, "target");
  const put = (base, path, content) => {
    const file = join(base, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  return { source, target, put };
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("release static asset compatibility", () => {
  it("keeps assets for both pages and leaves mutable public data out", () => {
    const { source, target, put } = fixture();
    put(source, "_next/static/chunks/old.js", "old page");
    put(source, "_next/static/chunks/shared.js", "shared");
    put(source, "race-elevation/tokyo.json", "old data");
    put(target, "_next/static/chunks/new.js", "new page");
    put(target, "_next/static/chunks/shared.js", "shared");
    put(target, "race-elevation/tokyo.json", "new data");
    expect(mergeReleaseStaticAssets(source, target).added).toBe(1);
    expect(readFileSync(join(target, "_next/static/chunks/old.js"), "utf8")).toBe("old page");
    expect(readFileSync(join(target, "_next/static/chunks/new.js"), "utf8")).toBe("new page");
    expect(readFileSync(join(target, "race-elevation/tokyo.json"), "utf8")).toBe("new data");
    expect(mergeReleaseStaticAssets(source, target).added).toBe(0);
  });

  it("rejects a conflicting path before making any changes", () => {
    const { source, target, put } = fixture();
    put(source, "_next/static/chunks/a.js", "new file");
    put(source, "_next/static/chunks/z.js", "different content");
    put(target, "_next/static/chunks/z.js", "keep this");
    expect(() => mergeReleaseStaticAssets(source, target)).toThrow("different content");
    expect(existsSync(join(target, "_next/static/chunks/a.js"))).toBe(false);
    expect(readFileSync(join(target, "_next/static/chunks/z.js"), "utf8")).toBe("keep this");
  });
});
