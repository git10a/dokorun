import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { races } from "../src/lib/races";
import { raceDateKey } from "../src/lib/race-date";
import { raceCourseMeta } from "../src/lib/race-page";
import { raceEditorial } from "../src/lib/course-editorial";
import { getRaceAtmosphere } from "../src/lib/race-atmosphere";
import { elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";

// These are research candidates, never publication approvals. A range midpoint
// can be on the wrong side of a bridge or on the other leg of a turnaround.
const reportPath = resolve(process.argv[2] ?? "output/race-atmosphere/expansion-plan.json");
const records = races
  .map((race) => {
    const meta = raceCourseMeta[race.slug];
    const entry = raceEditorial[race.slug];
    const atmosphere = getRaceAtmosphere(race.slug, meta?.courseYear);
    const profilePath = resolve(`public/race-elevation/${race.slug}.json`);
    const profileText = existsSync(profilePath) ? readFileSync(profilePath, "utf8") : undefined;
    const profile = profileText ? (JSON.parse(profileText) as RaceElevation) : undefined;
    const points = (entry?.points ?? []).map((point, index) => {
      const scene = atmosphere?.scenes.find((item) => item.id === point.sceneId);
      const bounds = point.distance.split("〜").map(Number);
      const distanceM = (bounds.reduce((sum, km) => sum + km, 0) / bounds.length) * 1000;
      const candidate = profile ? elevationPointAtDistance(profile.points, distanceM) : null;
      const ahead = profile ? elevationPointAtDistance(profile.points, distanceM + 40) : null;
      let heading: number | undefined;
      if (candidate && ahead) {
        const lat1 = (candidate.lat * Math.PI) / 180;
        const lat2 = (ahead.lat * Math.PI) / 180;
        const delta = ((ahead.lng - candidate.lng) * Math.PI) / 180;
        heading =
          Math.round(
            (Math.atan2(
              Math.sin(delta) * Math.cos(lat2),
              Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta),
            ) *
              180) /
              Math.PI +
              360,
          ) % 360;
      }
      return {
        id: point.sceneId ?? `${race.slug}-point-${index + 1}`,
        heading: point.heading,
        distanceLabel: `${point.distance}${point.distanceUnit}`,
        body: point.body,
        status: scene && existsSync(resolve(`public${scene.imageSrc}`)) ? "ready" : "needs-scenery-review",
        imageSrc: scene?.imageSrc,
        candidate: candidate && {
          distanceM: candidate.distanceM,
          lat: Number(candidate.lat.toFixed(6)),
          lng: Number(candidate.lng.toFixed(6)),
          heading,
          streetViewUrl: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${candidate.lat.toFixed(6)},${candidate.lng.toFixed(6)}&heading=${heading}&pitch=0&fov=80`,
        },
      };
    });
    return {
      slug: race.slug,
      name: race.name,
      raceDate: raceDateKey(race),
      courseYear: meta?.courseYear ?? null,
      routeFingerprint: profileText ? createHash("sha256").update(profileText).digest("hex") : null,
      courseSource: meta?.sourceUrl ?? race.officialUrl,
      editorialYear: entry?.courseYear ?? null,
      sourceNote: entry?.sourceNote,
      status: !entry ? "needs-editorial" : points.every((point) => point.status === "ready") ? "ready" : "needs-images",
      points,
    };
  })
  .sort((a, b) => (a.raceDate ?? "9999").localeCompare(b.raceDate ?? "9999") || a.slug.localeCompare(b.slug));

const summary = {
  races: records.length,
  readyRaces: records.filter((record) => record.status === "ready").length,
  missingEditorials: records.filter((record) => record.status === "needs-editorial").length,
  points: records.reduce((sum, record) => sum + record.points.length, 0),
  readyPoints: records.reduce(
    (sum, record) => sum + record.points.filter((point) => point.status === "ready").length,
    0,
  ),
};
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  `${JSON.stringify({ note: "候補座標は掲載ルートから機械的に算出。ストリートビューの地点・向き・景観を確認するまで画像制作・掲載には使わない。", summary, races: records }, null, 2)}\n`,
);
console.log(JSON.stringify({ reportPath, ...summary }));
