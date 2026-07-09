// 合成トラックGPX(data/gpx/<slug>.gpx)をフル解像度のままcourses.geojson/geojson_simplifiedへ直接書き込む。
// gpx:applyのDP簡略化(≈5.5m)は1周200〜400mの小さなトラックを多角形に潰すため、トラック系はこちらを使う。
// 距離は実測ではなく公式値(distance_m)を設定し、代表点はGPX始点に移す。
// 使い方: node scripts/apply-track-geojson.mjs <slug> <officialDistanceM> [...]
//   例: node scripts/apply-track-geojson.mjs tokyo-metropolitan-gymnasium-track 200
// 接続先は .env.local の DATABASE_URL(環境変数で上書き可)。
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2 !== 0) {
  console.error("使い方: node scripts/apply-track-geojson.mjs <slug> <officialDistanceM> [<slug> <officialDistanceM> ...]");
  process.exit(1);
}
const targets = [];
for (let i = 0; i < args.length; i += 2) targets.push({ slug: args[i], officialDistanceM: Number(args[i + 1]) });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const { slug, officialDistanceM } of targets) {
    const gpx = readFileSync(`data/gpx/${slug}.gpx`, "utf8");
    const coords = [...gpx.matchAll(/<trkpt lat="([\d.]+)" lon="([\d.]+)"/g)]
      .map((m) => [Number(m[2]), Number(m[1])]); // [lng, lat]
    if (coords.length < 10) throw new Error(`${slug}: points too few (${coords.length})`);
    const geojson = { type: "LineString", coordinates: coords };
    const [spot] = await sql`select id from spots where slug = ${slug}`;
    if (!spot) throw new Error(`${slug}: spot not found`);
    const start = coords[0];
    await sql`update spots set lat = ${start[1]}, lng = ${start[0]}, updated_at = now() where id = ${spot.id}`;
    const result = await sql`update courses set
        geojson = ${sql.json(geojson)},
        geojson_simplified = ${sql.json(geojson)},
        distance_m = ${officialDistanceM},
        elevation_gain_m = 0
      where spot_id = ${spot.id} and is_primary = true`;
    console.log(`ok: ${slug} points=${coords.length} distance=${officialDistanceM} start=${start[1]},${start[0]} rows=${result.count}`);
  }
} finally {
  await sql.end();
}
