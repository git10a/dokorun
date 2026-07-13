import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gpxResultFromPoints, haversine } from "../src/lib/gpx";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { pointsToGpx, rotateClosedLoopPoints } from "../src/lib/gpx-export";

type SourcePoint = { id: string; name: string; anchorLat: number; anchorLng: number };
type SourceStart = { id: string; name: string; routeAnchorLat: number; routeAnchorLng: number };
type GuideSource = {
  slug: string;
  intro: string;
  warnings: unknown[];
  startPoints: SourceStart[];
  checkpoints: SourcePoint[];
};

const sourcePath = resolve("data/course-guides/kamakura-issyu-trail.json");
const gpxPath = resolve("data/gpx/kamakura-issyu-trail.gpx");
const outputPath = resolve("src/generated/course-guides/kamakura-issyu-trail.json");
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as GuideSource & Record<string, unknown>;
if (!/^[a-z0-9-]+$/.test(source.slug)) throw new Error(`不正なslugです: ${source.slug}`);

const points = parseGpxPoints(readFileSync(gpxPath, "utf8"));
const result = gpxResultFromPoints(points);
if (!result.elevationProfile) throw new Error("高低図を生成できる標高データがありません");

const cumulative = [0];
for (let index = 1; index < points.length; index += 1) cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));

function snap(target: { lat: number; lng: number }, label: string) {
  const index = points.reduce((best, point, pointIndex) => haversine(point, target) < haversine(points[best], target) ? pointIndex : best, 0);
  const gapM = Math.round(haversine(points[index], target));
  if (gapM > 150) throw new Error(`${label}がGPXから離れすぎています: ${gapM}m`);
  return {
    routePointIndex: index,
    routeDistanceM: Math.round(cumulative[index]),
    routeLat: points[index].lat,
    routeLng: points[index].lng,
    elevationM: points[index].ele === null ? null : Math.round(points[index].ele * 10) / 10,
    snapGapM: gapM,
  };
}

const checkpoints = source.checkpoints.map((checkpoint) => ({
  ...checkpoint,
  ...snap({ lat: checkpoint.anchorLat, lng: checkpoint.anchorLng }, checkpoint.name),
}));

const gpxDirectory = resolve("public/gpx");
mkdirSync(gpxDirectory, { recursive: true });
const startPoints = source.startPoints.map((start) => {
  const snapped = snap({ lat: start.routeAnchorLat, lng: start.routeAnchorLng }, start.name);
  const gpxHref = `/gpx/${source.slug}-${start.id}.gpx`;
  const rotated = rotateClosedLoopPoints(points, { lat: snapped.routeLat, lng: snapped.routeLng });
  writeFileSync(resolve(`public${gpxHref}`), pointsToGpx(`${source.slug} (${start.name}スタート)`, rotated));
  return { ...start, ...snapped, gpxHref };
});

const generated = {
  ...source,
  distanceM: result.distanceM,
  elevationGainM: result.elevationGainM,
  elevationProfile: result.elevationProfile,
  startPoints,
  checkpoints,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.log(JSON.stringify({
  slug: source.slug,
  distanceKm: Number((result.distanceM / 1000).toFixed(2)),
  elevationGainM: result.elevationGainM,
  elevationSamples: result.elevationProfile.length,
  starts: startPoints.map(({ id, routeDistanceM, snapGapM, gpxHref }) => ({ id, routeDistanceM, snapGapM, gpxHref })),
  checkpoints: checkpoints.map(({ id, routeDistanceM, snapGapM }) => ({ id, routeDistanceM, snapGapM })),
}, null, 2));
