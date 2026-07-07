import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { parseGpx } from "../src/lib/gpx";
import { getDb } from "../src/db";
import { courses, spots } from "../src/db/schema";

config({ path: ".env.local" });
config();

// 使い方: npm run gpx:apply -- <slug> <gpxファイルパス> [--keep-latlng]
// GPXを解析してスポットの代表コース(geojson・距離・獲得標高・形状)と代表点を更新する。
// 管理画面のGPXアップロード→保存と同じ内容をCLIから実行するためのスクリプト。
async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const keepLatLng = args.includes("--keep-latlng");
  const [slug, gpxPath] = args.filter((arg) => !arg.startsWith("--"));
  if (!slug || !gpxPath) {
    console.error("使い方: npm run gpx:apply -- <slug> <gpxファイルパス> [--keep-latlng]");
    process.exit(1);
  }

  const gpx = parseGpx(readFileSync(gpxPath, "utf8"));
  const db = getDb();
  const spot = await db.query.spots.findFirst({ where: eq(spots.slug, slug) });
  if (!spot) {
    console.error(`スポットが見つかりません: ${slug}`);
    process.exit(1);
  }
  const course = await db.query.courses.findFirst({ where: eq(courses.spotId, spot.id) });

  await db.transaction(async (tx) => {
    if (!keepLatLng) {
      await tx.update(spots).set({ lat: gpx.startPoint.lat, lng: gpx.startPoint.lng, updatedAt: new Date() }).where(eq(spots.id, spot.id));
    }
    const values = {
      geojson: gpx.geojson,
      distanceM: Math.round(gpx.distanceM),
      elevationGainM: gpx.elevationGainM,
    };
    if (course) {
      // courseTypeは調査時にキュレーション済みの値(track等)を保持し、上書きしない
      await tx.update(courses).set(values).where(eq(courses.id, course.id));
    } else {
      await tx.insert(courses).values({ ...values, courseType: gpx.suggestedCourseType, spotId: spot.id, surface: "asphalt" });
    }
  });

  console.log(JSON.stringify({
    slug,
    name: spot.name,
    previousDistanceM: course?.distanceM ?? null,
    distanceM: Math.round(gpx.distanceM),
    elevationGainM: gpx.elevationGainM,
    courseType: gpx.suggestedCourseType,
    startPoint: keepLatLng ? "維持" : gpx.startPoint,
    points: gpx.geojson.coordinates.length,
  }, null, 2));
  process.exit(0);
}

void main().catch((error) => { console.error(error); process.exit(1); });
