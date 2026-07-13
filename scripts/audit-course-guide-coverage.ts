import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { gpxResultFromPoints, haversine } from "../src/lib/gpx";
import { parseGpxPoints } from "../src/lib/gpx-node";

type CourseRow = {
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  description: string;
  access: string;
  course_type: "loop" | "out_and_back" | "one_way" | "track";
  distance_m: number;
  elevation_gain_m: number | null;
  surface: string;
};

async function main() {
const databasePath = resolve(process.argv[2] ?? ".d1-build/prod.sqlite");
const outputPath = resolve(process.argv[3] ?? "data/course-guides/coverage.json");
const client = createClient({ url: `file:${databasePath}` });
const result = await client.execute(`
  select s.slug, s.name, s.prefecture, s.city, s.description, s.access,
    c.course_type, c.distance_m, c.elevation_gain_m, c.surface
  from spots s
  join courses c on c.spot_id = s.id
  where s.is_published = 1 and c.is_primary = 1
  order by s.slug
`);

const entries = (result.rows as unknown as CourseRow[]).map((row) => {
  const gpxPath = resolve("data/gpx", `${row.slug}.gpx`);
  const guidePath = resolve("data/course-guides", `${row.slug}.json`);
  if (!existsSync(gpxPath)) {
    return { ...row, hasGpx: false, hasGuide: existsSync(guidePath), issues: ["missing_gpx"] };
  }

  try {
    const points = parseGpxPoints(readFileSync(gpxPath, "utf8"));
    const parsed = gpxResultFromPoints(points);
    const closureGapM = Math.round(haversine(points[0], points.at(-1) ?? points[0]));
    const distanceDifferencePct = row.distance_m > 0
      ? Math.round((Math.abs(parsed.distanceM - row.distance_m) / row.distance_m) * 10_000) / 100
      : null;
    const issues: string[] = [];
    if (!parsed.elevationProfile) issues.push("missing_gpx_elevation");
    if (distanceDifferencePct !== null && distanceDifferencePct > 5) issues.push("distance_mismatch_over_5pct");
    if (row.course_type === "loop" && closureGapM > 250) issues.push("loop_not_closed");
    if (row.course_type === "one_way" && closureGapM <= 250) issues.push("one_way_looks_closed");
    if (row.course_type === "out_and_back" && parsed.suggestedCourseType === "loop") issues.push("out_and_back_looks_loop");
    return {
      ...row,
      hasGpx: true,
      hasGuide: existsSync(guidePath),
      pointCount: points.length,
      gpxDistanceM: parsed.distanceM,
      distanceDifferencePct,
      closureGapM,
      hasGpxElevation: Boolean(parsed.elevationProfile),
      detectedCourseType: parsed.suggestedCourseType,
      issues,
    };
  } catch (error) {
    return {
      ...row,
      hasGpx: true,
      hasGuide: existsSync(guidePath),
      issues: ["invalid_gpx"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

const byCourseType = Object.fromEntries(["loop", "out_and_back", "one_way", "track"].map((courseType) => {
  const matching = entries.filter((entry) => entry.course_type === courseType);
  return [courseType, {
    total: matching.length,
    withGuide: matching.filter((entry) => entry.hasGuide).length,
    withElevation: matching.filter((entry) => "hasGpxElevation" in entry && entry.hasGpxElevation).length,
    withIssues: matching.filter((entry) => entry.issues.length > 0).length,
  }];
}));
const issueCounts = entries.flatMap((entry) => entry.issues).reduce<Record<string, number>>((counts, issue) => {
  counts[issue] = (counts[issue] ?? 0) + 1;
  return counts;
}, {});

const audit = {
  generatedAt: new Date().toISOString(),
  sourceDatabase: databasePath,
  totals: {
    publishedSpots: entries.length,
    withGpx: entries.filter((entry) => entry.hasGpx).length,
    withGuide: entries.filter((entry) => entry.hasGuide).length,
    withGpxElevation: entries.filter((entry) => "hasGpxElevation" in entry && entry.hasGpxElevation).length,
    withIssues: entries.filter((entry) => entry.issues.length > 0).length,
  },
  byCourseType,
  issueCounts,
  entries,
};

mkdirSync(resolve(outputPath, ".."), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...audit.totals, byCourseType, issueCounts }, null, 2));
await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
