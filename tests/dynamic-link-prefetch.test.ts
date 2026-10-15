import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// /login・/spots は force-dynamic。プリフェッチのたびにWorkerでフルレンダーが走り、
// 無料プランのCPU上限(10ms)を大きく超えるので、リンクは押されたときだけ取りに行く
const dynamicHref = /href=(?:"|\{`|\{)(?:\/login|\/spots(?![/\w-])|loginHref\b)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("links to force-dynamic pages", () => {
  it("do not prefetch /login or /spots", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      for (const [tag] of readFileSync(file, "utf8").matchAll(/<Link\b[\s\S]*?>/g)) {
        if (dynamicHref.test(tag) && !tag.includes("prefetch={false}")) offenders.push(`${file}: ${tag}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
