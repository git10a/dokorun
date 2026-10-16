import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { haversine } from "../src/lib/gpx";
import { raceElevationFromPoints, raceElevationGain } from "../src/lib/race-elevation";

const backfill = JSON.parse(readFileSync(resolve("data/course-guides/elevation-backfill.json"), "utf8")) as {
  entries: { slug: string }[];
};
const terrainSlugs = new Set(backfill.entries.map((entry) => entry.slug));
const routeReviews = JSON.parse(readFileSync(resolve("data/spot-experience/route-reviews.json"), "utf8")) as Record<
  string,
  { status: string; correction?: { elevationSource?: string; elevationGapNotice?: string } }
>;
const elevationCorrections = new Set(
  readdirSync(resolve("data/spot-experience/elevation-corrections"))
    .filter((file) => file.endsWith(".json") && !file.endsWith("-before.json"))
    .map((file) => file.slice(0, -5)),
);
const out = resolve("public/spot-elevation");
mkdirSync(out, { recursive: true });
let count = 0;
const summaries: Record<string, { elevationGainM: number | null }> = {};
for (const file of readdirSync(resolve("data/gpx"))
  .filter((file) => /^[a-z0-9-]+\.gpx$/.test(file))
  .sort()) {
  const slug = file.slice(0, -4);
  const points = parseGpxPoints(readFileSync(resolve("data/gpx", file), "utf8"));
  if (points.length < 2) throw new Error(`${slug}: missing course`);
  const guidePath = resolve("public/course-guides", `${slug}.json`);
  const guide = existsSync(guidePath)
    ? (JSON.parse(readFileSync(guidePath, "utf8")) as { distanceM: number; startPoints: { routeMode: string }[]; elevationGapNotice?: string })
    : null;
  // Match build-course-guide exactly so each start and scene keeps its distance axis.
  if (guide?.startPoints.some((start) => start.routeMode === "loop")) {
    const gap = haversine(points[0], points.at(-1)!);
    if (gap > 250) throw new Error(`${slug}: loop is not closed`);
    if (gap > 5) points.push({ ...points[0] });
  }
  const profile = raceElevationFromPoints(points);
  const gapNotice = routeReviews[slug]?.correction?.elevationGapNotice ?? guide?.elevationGapNotice;
  if (gapNotice) profile.elevationGapNotice = gapNotice;
  if (routeReviews[slug]?.status === "route-mismatch") profile.routeReviewRequired = true;
  if (guide && Math.abs(profile.points.at(-1)!.distanceM - guide.distanceM) > 1)
    throw new Error(`${slug}: guide distance mismatch`);
  if (routeReviews[slug]?.correction?.elevationSource === "gsi" || elevationCorrections.has(slug)) {
    profile.source = "gsi";
  } else if (terrainSlugs.has(slug))
    profile.attribution = {
      label: "Open-Meteo 標高データを加工（CC BY 4.0）",
      url: "https://open-meteo.com/en/docs/elevation-api",
    };
  writeFileSync(resolve(out, `${slug}.json`), JSON.stringify(profile));
  summaries[slug] = { elevationGainM: raceElevationGain(profile) };
  count++;
}
writeFileSync(resolve("src/lib/spot-elevation-summaries.json"), JSON.stringify(summaries));
console.log(`Built ${count} spot elevation profiles with distance-aligned coordinates`);
