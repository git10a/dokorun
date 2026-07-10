import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseGpx } from "../src/lib/gpx-node";
import { simplifyCourseGeojson } from "../src/lib/course-geojson";
import { raceBySlug } from "../src/lib/races";

// 使い方: npm run race-gpx:apply -- <race-slug> <gpxファイルパス> --source <gps|map>
// GPXを解析して大会コースの参考図を public/race-courses/<slug>.json に書き出し、
// src/lib/race-courses.json のマニフェスト(距離・獲得標高・データ由来)を更新する。
// geojsonをWorkerバンドルに含めない(3MiB制限)ため、静的アセットとして配信する構成。
// - source=gps: 大会当日の実走GPSデータ由来(正確)
// - source=map: 公式コース図をもとにBRouter等で再現した参考図
// GPX原本は data/race-gpx/<slug>.gpx に必ず残すこと(原本保全)。

const MANIFEST_PATH = join(process.cwd(), "src", "lib", "race-courses.json");
const OUT_DIR = join(process.cwd(), "public", "race-courses");

function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const sourceIndex = args.indexOf("--source");
  const source = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
  const positional = args.filter((arg, index) => !arg.startsWith("--") && index !== sourceIndex + 1);
  const [slug, gpxPath] = positional;
  if (!slug || !gpxPath || (source !== "gps" && source !== "map")) {
    console.error("使い方: npm run race-gpx:apply -- <race-slug> <gpxファイルパス> --source <gps|map>");
    process.exit(1);
  }
  if (!raceBySlug.has(slug)) {
    console.error(`大会が見つかりません: ${slug} (src/lib/races.ts に定義を追加してから実行する)`);
    process.exit(1);
  }

  const gpx = parseGpx(readFileSync(gpxPath, "utf8"));
  const simplified = simplifyCourseGeojson(gpx.geojson);
  if (!simplified) {
    console.error("GPXからコースを取得できませんでした");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${slug}.json`);
  writeFileSync(outPath, JSON.stringify(simplified));

  const manifest: Record<string, { distanceM: number; elevationGainM: number | null; source: "gps" | "map" }> = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : {};
  manifest[slug] = { distanceM: Math.round(gpx.distanceM), elevationGainM: gpx.elevationGainM, source };
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(JSON.stringify({ slug, source, distanceM: Math.round(gpx.distanceM), elevationGainM: gpx.elevationGainM, points: simplified.coordinates.length, bytes: JSON.stringify(simplified).length, outPath }, null, 2));
}

main();
