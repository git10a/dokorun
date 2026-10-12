// 公式コース図から拾った経由点をOSM道路へスナップし、大会参考GPXを生成する。
// 使い方: npx tsx scripts/osrm-to-gpx.ts <out.gpx> <name> <lng,lat|lng,lat|...>
import { writeFileSync } from "node:fs";
import { pointsToGpx } from "../src/lib/gpx-export";

async function main() {
  const [outPath, name, coordinates] = process.argv.slice(2);
  if (!outPath || !name || !coordinates) {
    console.error("使い方: npx tsx scripts/osrm-to-gpx.ts <out.gpx> <name> <lng,lat|lng,lat|...>");
    process.exit(1);
  }
  const routePoints = coordinates
    .split("|")
    .map((point) => point.split(",").map(Number).join(","))
    .join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${routePoints}?overview=full&geometries=geojson&steps=false&continue_straight=true`;
  const response = await fetch(url, { headers: { "User-Agent": "dokorun-course-builder/1.0" } });
  if (!response.ok) throw new Error(`OSRM ${response.status}: ${await response.text()}`);
  const data = (await response.json()) as {
    routes?: { distance: number; geometry: { coordinates: [number, number][] } }[];
  };
  const route = data.routes?.[0];
  if (!route?.geometry.coordinates.length) throw new Error(`ルートを取得できません: ${JSON.stringify(data)}`);
  writeFileSync(
    outPath,
    pointsToGpx(
      name,
      route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng, ele: null })),
    ),
  );
  console.log(
    JSON.stringify({ distanceM: Math.round(route.distance), points: route.geometry.coordinates.length, outPath }),
  );
}

main();
