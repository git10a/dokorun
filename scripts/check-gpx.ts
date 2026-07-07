import { readFileSync } from "node:fs";
import { parseGpx } from "../src/lib/gpx";

// 使い方: npm run gpx:check -- <gpxファイルパス>
// GPXを登録せずに解析結果だけ表示する。gpx:applyの前の検証に使う。
const path = process.argv.slice(2).filter((arg) => arg !== "--")[0];
if (!path) {
  console.error("使い方: npm run gpx:check -- <gpxファイルパス>");
  process.exit(1);
}
const result = parseGpx(readFileSync(path, "utf8"));
console.log(JSON.stringify({
  distanceKm: Number((result.distanceM / 1000).toFixed(2)),
  elevationGainM: result.elevationGainM,
  courseType: result.suggestedCourseType,
  startPoint: result.startPoint,
  simplifiedPoints: result.geojson.coordinates.length,
}, null, 2));
