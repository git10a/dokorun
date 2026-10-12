import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RACE_GPX_DIR, raceElevationProfile } from "./lib/race-assets";

// ビルド前処理: data/race-gpx の原本から、公開用のGPX(public/race-gpx)と高低図(public/race-elevation)を作り直す
const gpxOut = join(process.cwd(), "public/race-gpx");
const elevationOut = join(process.cwd(), "public/race-elevation");
for (const directory of [gpxOut, elevationOut]) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
}
for (const file of readdirSync(RACE_GPX_DIR).filter((name) => name.endsWith(".gpx")).sort()) {
  if (!/^[a-z0-9-]+\.gpx$/.test(file)) throw new Error(`Invalid race GPX filename: ${file}`);
  const slug = file.replace(/\.gpx$/, "");
  const source = join(RACE_GPX_DIR, file);
  copyFileSync(source, join(gpxOut, file));
  const profile = raceElevationProfile(slug, readFileSync(source, "utf8"));
  writeFileSync(join(elevationOut, `${slug}.json`), JSON.stringify(profile));
  console.log(`${file}: ${profile.source}, ${profile.points.filter((point) => point.elevationM !== null).length}/${profile.points.length} elevations`);
}
