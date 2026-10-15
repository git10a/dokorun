import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RACE_GPX_DIR, raceElevationProfile } from "./lib/race-assets";
import { races } from "../src/lib/races";
import { buildRaceElevationBenchmarks } from "../src/lib/race-elevation-benchmark";
import type { RaceElevation } from "../src/lib/race-elevation";

// ビルド前処理: data/race-gpx の原本から、公開用のGPX(public/race-gpx)と高低図(public/race-elevation)を作り直す
const gpxOut = join(process.cwd(), "public/race-gpx");
const elevationOut = join(process.cwd(), "public/race-elevation");
for (const directory of [gpxOut, elevationOut]) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
}
const profiles: Record<string, RaceElevation> = {};
for (const file of readdirSync(RACE_GPX_DIR)
  .filter((name) => name.endsWith(".gpx"))
  .sort()) {
  if (!/^[a-z0-9-]+\.gpx$/.test(file)) throw new Error(`Invalid race GPX filename: ${file}`);
  const slug = file.replace(/\.gpx$/, "");
  const source = join(RACE_GPX_DIR, file);
  copyFileSync(source, join(gpxOut, file));
  const profile = raceElevationProfile(slug, readFileSync(source, "utf8"));
  profiles[slug] = profile;
  console.log(
    `${file}: ${profile.source}, ${profile.points.filter((point) => point.elevationM !== null).length}/${profile.points.length} elevations`,
  );
}
const benchmarks = buildRaceElevationBenchmarks(
  races.flatMap(({ slug, distanceLabel }) =>
    profiles[slug] ? [{ slug, distanceLabel, profile: profiles[slug] }] : [],
  ),
);
for (const [slug, profile] of Object.entries(profiles)) {
  writeFileSync(join(elevationOut, `${slug}.json`), JSON.stringify({ ...profile, benchmark: benchmarks[slug] }));
}
