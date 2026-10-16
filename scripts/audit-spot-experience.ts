import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { courseAtmospheres } from "../src/lib/course-atmosphere";
import spots from "../data/spot-experience/published-spots.json";
import { elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";
const entries = spots.map((spot) => {
  const profilePath = `public/spot-elevation/${spot.slug}.json`;
  const profile = existsSync(profilePath) ? (JSON.parse(readFileSync(profilePath, "utf8")) as RaceElevation) : null;
  const scenes = courseAtmospheres[spot.slug]?.scenes ?? [];
  const ready = scenes.filter((s) => s.coursePoint && existsSync(`public${s.imageSrc}`));
  return {
    ...spot,
    elevationReady: Boolean(profile && profile.points.length > 1 && !profile.routeReviewRequired),
    readyImages: ready.length,
    imagesRemaining: Math.max(0, 2 - ready.length),
    status: profile?.routeReviewRequired
      ? "needs-route-review"
      : ready.length >= 2
        ? "ready"
        : "needs-reference-review-and-images",
    candidatePoints: [1 / 3, 2 / 3].map((fraction) => {
      const p = profile ? elevationPointAtDistance(profile.points, profile.points.at(-1)!.distanceM * fraction) : null;
      return p
        ? {
            ...p,
            referenceCandidateUrl: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat},${p.lng}`,
            visualReview: false,
          }
        : null;
    }),
  };
});
const report = {
  totalSpots: entries.length,
  elevationReady: entries.filter((e) => e.elevationReady).length,
  imageReadySpots: entries.filter((e) => e.readyImages >= 2).length,
  readyImages: entries.reduce((n, e) => n + e.readyImages, 0),
  imagesRemaining: entries.reduce((n, e) => n + e.imagesRemaining, 0),
  entries,
};
writeFileSync("data/spot-experience/coverage.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, entries: undefined }));
if (
  process.argv.includes("--require-complete") &&
  (report.imagesRemaining || report.elevationReady !== report.totalSpots)
)
  process.exitCode = 1;
