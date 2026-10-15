import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { raceCourseMeta } from "../src/lib/race-page";
import { races } from "../src/lib/races";
import { elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";
import type { RaceEditorial } from "../src/lib/course-editorial";
import type { RaceAtmosphere } from "../src/lib/race-atmosphere";

type ReviewedScene = {
  id: string;
  slug: string;
  index: number;
  distanceM: number;
  heading: number;
  pitch?: number;
  pano: string;
  viewLabel: string;
  observations: string;
  generatedPath: string;
  visualReview: string;
  referenceUrl?: string;
  coursePoint?: { distanceM: number; lat: number; lng: number };
  originalPath?: string;
  publicPath?: string;
};

// Only imports explicit, visually reviewed images. It never generates or approves
// a scene from an unreviewed coordinate in the coverage report.
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("Pass a reviewed sources-and-prompts JSON file");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { scenes: ReviewedScene[] };
const editorialsPath = "src/lib/race-preparation.json";
const catalogPath = "src/lib/race-atmosphere-scenes.json";
const editorials = JSON.parse(readFileSync(editorialsPath, "utf8")) as Record<string, RaceEditorial>;
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Record<string, RaceAtmosphere>;

const reviewed = manifest.scenes.map((scene) => {
  const meta = raceCourseMeta[scene.slug];
  const sourceUrl = meta?.sourceUrl ?? races.find((race) => race.slug === scene.slug)?.officialUrl;
  const editorial = editorials[scene.slug]?.points[scene.index];
  if (
    !meta ||
    !sourceUrl ||
    !editorial ||
    !scene.observations ||
    !scene.visualReview ||
    !scene.pano ||
    !scene.generatedPath
  ) {
    throw new Error(`Incomplete review: ${scene.id}`);
  }
  if (!Number.isFinite(scene.distanceM) || scene.distanceM < 0) throw new Error(`Invalid distance: ${scene.id}`);
  const profile = JSON.parse(readFileSync(`public/race-elevation/${scene.slug}.json`, "utf8")) as RaceElevation;
  const position = elevationPointAtDistance(profile.points, scene.distanceM);
  if (!position || Math.abs(position.distanceM - scene.distanceM) > 0.01) throw new Error(`Off route: ${scene.id}`);
  // Read all inputs before mutating the runtime catalogs.
  readFileSync(scene.generatedPath);
  return { scene, courseYear: meta.courseYear ?? null, sourceUrl, editorial, position };
});

mkdirSync("output/race-atmosphere", { recursive: true });
mkdirSync("public/race-atmosphere", { recursive: true });
async function importScenes() {
  for (const { scene, courseYear, sourceUrl, editorial, position } of reviewed) {
    scene.referenceUrl ??= `https://www.google.com/maps/@?api=1&map_action=pano&pano=${scene.pano}&heading=${scene.heading}&pitch=${scene.pitch ?? 0}&fov=80`;
    scene.coursePoint = { distanceM: scene.distanceM, lat: position.lat, lng: position.lng };
    scene.originalPath = `output/race-atmosphere/${scene.id}.png`;
    scene.publicPath = `public/race-atmosphere/${scene.id}.webp`;
    if (resolve(scene.generatedPath) !== resolve(scene.originalPath))
      copyFileSync(scene.generatedPath, scene.originalPath);
    await sharp(scene.originalPath).resize(1280, 720, { fit: "cover" }).webp({ quality: 85 }).toFile(scene.publicPath);
    const atmosphere = catalog[scene.slug] ?? { courseYear, sourceUrl, scenes: [] };
    if (atmosphere.courseYear !== courseYear) throw new Error(`Course edition changed: ${scene.slug}`);
    const entry = {
      id: scene.id,
      title: editorial.heading,
      description: editorial.body,
      viewLabel: scene.viewLabel,
      imageSrc: `/${scene.publicPath.replace(/^public\//, "")}`,
      referenceUrl: scene.referenceUrl,
      coursePoint: scene.coursePoint,
    };
    const index = atmosphere.scenes.findIndex((item) => item.id === scene.id);
    if (index < 0) atmosphere.scenes.push(entry);
    else atmosphere.scenes[index] = entry;
    catalog[scene.slug] = atmosphere;
    editorial.sceneId = scene.id;
  }
  writeFileSync(editorialsPath, `${JSON.stringify(editorials, null, 2)}\n`);
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    JSON.stringify({ imported: reviewed.length, races: [...new Set(reviewed.map(({ scene }) => scene.slug))] }),
  );
}
void importScenes().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
