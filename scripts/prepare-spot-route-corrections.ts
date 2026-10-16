import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { parseGpx } from "../src/lib/gpx-node";
import { simplifyCourseGeojson } from "../src/lib/course-geojson";
import { raceElevationGain, type RaceElevation } from "../src/lib/race-elevation";

// Produces a guarded, reversible SQL patch from reviewed public route data.
// --apply-local applies only to the explicit local build snapshot, never remote D1.
async function main() {
  const dir = resolve("data/spot-experience/route-corrections");
  const client = createClient({ url: `file:${resolve(".d1-build/prod.sqlite")}` });
  const quote = (v: unknown): string =>
    v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
  const updates: string[] = [];
  const rollback: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith("-before.json"))) {
    const data = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
    if (!data.slug || !data.config) continue;
    const { slug, config } = data;
    const beforeFile = resolve(dir, `${slug}-before.json`);
    const previous = existsSync(beforeFile)
      ? JSON.parse(readFileSync(beforeFile, "utf8"))
      : {
          spot: (
            await client.execute({
              sql: "SELECT id, slug, lat, lng, description, access FROM spots WHERE slug = ?",
              args: [slug],
            })
          ).rows[0],
          course: (
            await client.execute({
              sql: "SELECT c.id, c.spot_id, c.name, c.geojson, c.geojson_simplified, c.distance_m, c.elevation_gain_m, c.course_type, c.surface, c.signals_count FROM courses c JOIN spots s ON s.id = c.spot_id WHERE s.slug = ? AND c.is_primary = 1",
              args: [slug],
            })
          ).rows[0],
        };
    if (!previous.spot || !previous.course) throw new Error(`${slug}: primary course missing`);
    if (!existsSync(beforeFile)) writeFileSync(beforeFile, JSON.stringify(previous, null, 2) + "\n");
    const gpx = parseGpx(readFileSync(resolve("data/gpx", `${slug}.gpx`), "utf8"));
    const profile = JSON.parse(readFileSync(resolve("public/spot-elevation", `${slug}.json`), "utf8")) as RaceElevation;
    if (profile.routeReviewRequired) throw new Error(`${slug}: still under review`);
    const spot = { lat: gpx.startPoint.lat, lng: gpx.startPoint.lng, description: config.intro, access: config.access };
    const course = {
      name: config.routeName,
      geojson: JSON.stringify(gpx.geojson),
      geojson_simplified: JSON.stringify(simplifyCourseGeojson(gpx.geojson)),
      distance_m: Math.round(gpx.distanceM),
      elevation_gain_m: raceElevationGain(profile),
      course_type: config.courseType ?? "loop",
      surface: config.surface,
      signals_count: config.signalsCount === undefined ? 0 : config.signalsCount,
    };
    const set = (row: Record<string, unknown>) =>
      Object.entries(row)
        .map(([key, value]) => `${key} = ${quote(value)}`)
        .join(", ");
    const matches = (row: Record<string, unknown>) =>
      Object.entries(row)
        .map(([key, value]) => `${key} IS ${quote(value)}`)
        .join(" AND ");
    const oldSpot = Object.fromEntries(Object.keys(spot).map((key) => [key, previous.spot[key]]));
    const oldCourse = Object.fromEntries(Object.keys(course).map((key) => [key, previous.course[key]]));
    updates.push(
      `-- ${slug}`,
      `UPDATE spots SET ${set(spot)}, updated_at = unixepoch() * 1000 WHERE id = ${quote(previous.spot.id)} AND ${matches(oldSpot)};`,
      `UPDATE courses SET ${set(course)} WHERE id = ${quote(previous.course.id)} AND ${matches(oldCourse)};`,
    );
    rollback.push(
      `-- ${slug}`,
      `UPDATE spots SET ${set(oldSpot)}, updated_at = unixepoch() * 1000 WHERE id = ${quote(previous.spot.id)} AND ${matches(spot)};`,
      `UPDATE courses SET ${set(oldCourse)} WHERE id = ${quote(previous.course.id)} AND ${matches(course)};`,
    );
    for (const tagId of config.removeTagIds ?? []) {
      updates.push(
        `DELETE FROM spot_tags WHERE spot_id = ${quote(previous.spot.id)} AND tag_id = ${quote(tagId)} AND EXISTS (SELECT 1 FROM spots WHERE id = ${quote(previous.spot.id)} AND ${matches(spot)});`,
      );
      rollback.push(
        `INSERT INTO spot_tags (spot_id, tag_id) SELECT ${quote(previous.spot.id)}, ${quote(tagId)} WHERE EXISTS (SELECT 1 FROM spots WHERE id = ${quote(previous.spot.id)} AND ${matches(oldSpot)}) AND NOT EXISTS (SELECT 1 FROM spot_tags WHERE spot_id = ${quote(previous.spot.id)} AND tag_id = ${quote(tagId)});`,
      );
    }
    console.log(`${slug}: ${course.distance_m}m, ${profile.points.length} height samples`);
  }
  const descriptionsPath = resolve("data/spot-experience/content-corrections.json");
  if (existsSync(descriptionsPath)) {
    const descriptions = JSON.parse(readFileSync(descriptionsPath, "utf8")) as {
      slug: string;
      id: string;
      description: string;
      previousDescription: string;
      removeTagIds?: string[];
    }[];
    for (const item of descriptions) {
      updates.push(
        `-- ${item.slug}: description only`,
        `UPDATE spots SET description = ${quote(item.description)}, updated_at = unixepoch() * 1000 WHERE id = ${quote(item.id)} AND slug = ${quote(item.slug)} AND description IS ${quote(item.previousDescription)};`,
      );
      rollback.push(
        `-- ${item.slug}: description only`,
        `UPDATE spots SET description = ${quote(item.previousDescription)}, updated_at = unixepoch() * 1000 WHERE id = ${quote(item.id)} AND slug = ${quote(item.slug)} AND description IS ${quote(item.description)};`,
      );
      for (const tagId of item.removeTagIds ?? []) {
        updates.push(
          `DELETE FROM spot_tags WHERE spot_id = ${quote(item.id)} AND tag_id = ${quote(tagId)} AND EXISTS (SELECT 1 FROM spots WHERE id = ${quote(item.id)} AND slug = ${quote(item.slug)} AND description IS ${quote(item.description)});`,
        );
        rollback.push(
          `INSERT INTO spot_tags (spot_id, tag_id) SELECT ${quote(item.id)}, ${quote(tagId)} WHERE EXISTS (SELECT 1 FROM spots WHERE id = ${quote(item.id)} AND slug = ${quote(item.slug)} AND description IS ${quote(item.previousDescription)}) AND NOT EXISTS (SELECT 1 FROM spot_tags WHERE spot_id = ${quote(item.id)} AND tag_id = ${quote(tagId)});`,
        );
      }
    }
  }
  writeFileSync(resolve(dir, "production-patch.sql"), updates.join("\n") + "\n");
  writeFileSync(resolve(dir, "production-rollback.sql"), rollback.join("\n") + "\n");
  if (process.argv.includes("--apply-local")) await client.executeMultiple(updates.join("\n"));
  client.close();
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
