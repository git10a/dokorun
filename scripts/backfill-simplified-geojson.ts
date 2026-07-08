import { eq, isNull } from "drizzle-orm";
import { config } from "dotenv";
import { getDb } from "../src/db";
import { courses } from "../src/db/schema";
import { simplifyCourseGeojson } from "../src/lib/course-geojson";

config({ path: ".env.local" });
config();

async function main() {
  const db = getDb();
  const rows = await db.select({ id: courses.id, geojson: courses.geojson }).from(courses).where(isNull(courses.geojsonSimplified));
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const geojsonSimplified = simplifyCourseGeojson(row.geojson);
    if (!geojsonSimplified) {
      skipped += 1;
      continue;
    }
    await db.update(courses).set({ geojsonSimplified }).where(eq(courses.id, row.id));
    updated += 1;
  }
  console.log(JSON.stringify({ scanned: rows.length, updated, skipped }, null, 2));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
