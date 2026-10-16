import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { haversine } from "../src/lib/gpx";
import { elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";
import type { CourseAtmosphere } from "../src/lib/course-atmosphere";
type Scene = {
  slug: string;
  id: string;
  title: string;
  description: string;
  coursePoint: { distanceM: number; lat: number; lng: number };
  pano: { id: string; lat: number; lng: number; heading: number; captured: string };
  prompt: string;
  observed: string;
  generatedPath: string;
  sourceUrl?: string;
  visualReview: string;
  reviewStatus: "accepted";
};
async function main() {
  const records = JSON.parse(readFileSync(process.argv[2], "utf8")) as Scene[];
  const path = resolve("src/lib/spot-atmosphere-catalog.json");
  const catalog = JSON.parse(readFileSync(path, "utf8")) as Record<string, CourseAtmosphere>;
  // Validate the whole batch before writing any assets or catalog entries.
  for (const r of records) {
    if (!/^[a-z0-9-]+$/.test(r.slug) || !/^[a-z0-9-]+$/.test(r.id)) throw new Error("Invalid scene id");
    if (r.reviewStatus !== "accepted" || !r.visualReview || !r.observed || !r.prompt || !r.pano?.captured)
      throw new Error(`${r.slug}/${r.id}: visual review required`);
    if (r.sourceUrl) {
      const source = new URL(r.sourceUrl);
      if (
        source.protocol !== "https:" ||
        !["www.google.com", "www.google.co.jp"].includes(source.hostname) ||
        !source.pathname.startsWith("/maps/")
      )
        throw new Error(`${r.slug}/${r.id}: expected a Google Maps panorama source URL`);
    }
    if (!existsSync(r.generatedPath)) throw new Error(`Missing generated asset: ${r.generatedPath}`);
    const profile = JSON.parse(readFileSync(`public/spot-elevation/${r.slug}.json`, "utf8")) as RaceElevation;
    if (profile.routeReviewRequired) throw new Error(`${r.slug}: course needs review`);
    const point = elevationPointAtDistance(profile.points, r.coursePoint.distanceM);
    if (!point || haversine(point, r.coursePoint) > 5 || haversine(r.pano, r.coursePoint) > 120)
      throw new Error(`${r.slug}/${r.id}: source is off the course`);
    if (
      catalog[r.slug]?.scenes.some((s) => s.id === r.id) ||
      existsSync(`public/course-atmosphere/${r.slug}-${r.id}.webp`)
    )
      throw new Error(`${r.slug}/${r.id}: existing image must be preserved`);
  }
  for (const r of records) {
    const imageSrc = `/course-atmosphere/${r.slug}-${r.id}.webp`;
    await sharp(r.generatedPath).resize({ width: 1280 }).webp({ quality: 84 }).toFile(`public${imageSrc}`);
    catalog[r.slug] ??= { scenes: [] };
    catalog[r.slug].scenes.push({
      id: r.id,
      title: r.title,
      description: r.description,
      imageSrc,
      coursePoint: r.coursePoint,
      referenceUrl:
        r.sourceUrl ??
        `https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(r.pano.id)}&heading=${r.pano.heading}`,
    });
  }
  writeFileSync(path, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Imported ${records.length} reviewed course images`);
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
