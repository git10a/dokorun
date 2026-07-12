// 確認済みの周回GPXへ、周回路上の往復区間を加えて指定距離の大会参考GPXを作る。
// 使い方: node scripts/extend-loop-gpx.mjs <base.gpx> <out.gpx> <target-km> <name>
import { readFileSync, writeFileSync } from "node:fs";

const [basePath, outPath, targetText, ...nameParts] = process.argv.slice(2);
const targetM = Number(targetText) * 1000;
const name = nameParts.join(" ");
if (!basePath || !outPath || !Number.isFinite(targetM) || !name) {
  console.error("使い方: node scripts/extend-loop-gpx.mjs <base.gpx> <out.gpx> <target-km> <name>");
  process.exit(1);
}

const xml = readFileSync(basePath, "utf8");
const points = [...xml.matchAll(/<trkpt\s+([^>]+)>/g)].flatMap((match) => {
  const lat = match[1].match(/lat="([^"]+)"/);
  const lng = match[1].match(/lon="([^"]+)"/);
  return lat && lng ? [{ lat: Number(lat[1]), lng: Number(lng[1]) }] : [];
});
if (points.length < 2) throw new Error("GPXに十分なトラックポイントがありません");

const rad = (value) => value * Math.PI / 180;
const distance = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
};
const pathDistance = (path) => path.slice(1).reduce((sum, point, index) => sum + distance(path[index], point), 0);

const baseM = pathDistance(points);
const extensionM = (targetM - baseM) / 2;
if (extensionM <= 0 || extensionM >= baseM) throw new Error(`指定距離を作れません: base=${baseM} target=${targetM}`);

const spur = [points[0]];
let accumulated = 0;
for (let index = 1; index < points.length; index += 1) {
  const segmentM = distance(points[index - 1], points[index]);
  if (accumulated + segmentM >= extensionM) {
    const ratio = (extensionM - accumulated) / segmentM;
    spur.push({
      lat: points[index - 1].lat + (points[index].lat - points[index - 1].lat) * ratio,
      lng: points[index - 1].lng + (points[index].lng - points[index - 1].lng) * ratio,
    });
    break;
  }
  spur.push(points[index]);
  accumulated += segmentM;
}

const output = [...points, ...spur.slice(1), ...spur.slice(0, -1).reverse()];
const trkpts = output.map((point) => `<trkpt lat="${point.lat}" lon="${point.lng}"></trkpt>`).join("\n");
writeFileSync(outPath, `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="dokorun course builder" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>\n${trkpts}\n</trkseg></trk></gpx>\n`);
console.log(JSON.stringify({ baseM: Math.round(baseM), targetM: Math.round(pathDistance(output)), points: output.length, outPath }));
