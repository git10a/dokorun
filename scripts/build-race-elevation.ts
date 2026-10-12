import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { raceElevationFromPoints, type RaceElevation } from "../src/lib/race-elevation";

// Offline build: terrain supplements must match the exact GPX from which they were sampled.
const output = join(process.cwd(), "public/race-elevation");
mkdirSync(output, { recursive: true });
const routeReviews = JSON.parse(readFileSync("data/race-elevation/route-review.json", "utf8")) as Record<string, { gpxSha256: string }>;
for (const file of readdirSync("public/race-gpx").filter((name) => name.endsWith(".gpx"))) {
  const xml = readFileSync(join("public/race-gpx", file), "utf8");
  let profile = raceElevationFromPoints(parseGpxPoints(xml));
  const supplement = join("data/race-elevation", file.replace(/\.gpx$/, ".json"));
  if (existsSync(supplement)) {
    const cached = JSON.parse(readFileSync(supplement, "utf8")) as { gpxSha256: string; profile: RaceElevation };
    if (cached.gpxSha256 === createHash("sha256").update(xml).digest("hex")) profile = cached.profile;
    else console.warn(`${file}: GPX changed; terrain supplement skipped. Regenerate it.`);
  }
  if (routeReviews[file.replace(/\.gpx$/, "")]?.gpxSha256 === createHash("sha256").update(xml).digest("hex")) profile.routeReviewRequired = true;
  writeFileSync(join(output, file.replace(/\.gpx$/, ".json")), JSON.stringify(profile));
  console.log(`${file}: ${profile.source}, ${profile.points.filter((point) => point.elevationM !== null).length}/${profile.points.length} elevations`);
}
