import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseGpxPoints } from "../../src/lib/gpx-node";
import { raceElevationFromPoints, type RaceElevation } from "../../src/lib/race-elevation";

// 大会コースの原本は data/race-gpx/<slug>.gpx。公開用の public/race-gpx と public/race-elevation は
// ビルド時に build-race-elevation.ts がここから生成する(git では管理しない)
export const RACE_GPX_DIR = "data/race-gpx";

// GPXから高低図を作る。地形補完(data/race-elevation)は同じGPXから作ったものだけ採用する
export function raceElevationProfile(slug: string, xml: string): RaceElevation {
  const gpxSha256 = createHash("sha256").update(xml).digest("hex");
  let profile = raceElevationFromPoints(parseGpxPoints(xml));
  const supplement = join("data/race-elevation", `${slug}.json`);
  if (existsSync(supplement)) {
    const cached = JSON.parse(readFileSync(supplement, "utf8")) as { gpxSha256: string; profile: RaceElevation };
    if (cached.gpxSha256 === gpxSha256) profile = cached.profile;
    else console.warn(`${slug}.gpx: GPX changed; terrain supplement skipped. Regenerate it.`);
  }
  const routeReviews = JSON.parse(readFileSync("data/race-elevation/route-review.json", "utf8")) as Record<
    string,
    { gpxSha256: string }
  >;
  if (routeReviews[slug]?.gpxSha256 === gpxSha256) profile.routeReviewRequired = true;
  return profile;
}
