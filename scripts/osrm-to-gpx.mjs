// 公式コース図から拾った経由点をOSM道路へスナップし、大会参考GPXを生成する。
// 使い方: node scripts/osrm-to-gpx.mjs <out.gpx> <name> <lng,lat|lng,lat|...>
import { writeFileSync } from "node:fs";

const [outPath, name, coordinates] = process.argv.slice(2);
if (!outPath || !name || !coordinates) {
  console.error("使い方: node scripts/osrm-to-gpx.mjs <out.gpx> <name> <lng,lat|lng,lat|...>");
  process.exit(1);
}
const points = coordinates.split("|").map((point) => point.split(",").map(Number));
const routePoints = points.map(([lng, lat]) => `${lng},${lat}`).join(";");
const url = `https://router.project-osrm.org/route/v1/driving/${routePoints}?overview=full&geometries=geojson&steps=false&continue_straight=true`;
const response = await fetch(url, { headers: { "User-Agent": "dokorun-course-builder/1.0" } });
if (!response.ok) throw new Error(`OSRM ${response.status}: ${await response.text()}`);
const data = await response.json();
const path = data.routes?.[0]?.geometry?.coordinates;
if (!path?.length) throw new Error(`ルートを取得できません: ${JSON.stringify(data)}`);
const trkpts = path.map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`).join("\n");
writeFileSync(outPath, `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="dokorun course builder" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${name}</name><trkseg>\n${trkpts}\n</trkseg></trk></gpx>\n`);
console.log(JSON.stringify({ distanceM: Math.round(data.routes[0].distance), points: path.length, outPath }));
