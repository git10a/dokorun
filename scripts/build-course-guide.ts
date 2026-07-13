import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { gpxResultFromPoints, haversine } from "../src/lib/gpx";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { shiftRouteDistance } from "../src/lib/course-guide-profile";
import { pointsToGpx, reversePoints, rotateClosedLoopPoints } from "../src/lib/gpx-export";

type SourcePoint = { id: string; name: string; anchorLat: number; anchorLng: number };
type SourceStart = { id: string; name: string; routeAnchorLat: number; routeAnchorLng: number; routeMode?: "loop" | "forward" | "reverse" };
type GuideSource = {
  slug: string;
  intro: string;
  warnings: unknown[];
  startPoints: SourceStart[];
  checkpoints: SourcePoint[];
};

const sourceDirectory = resolve("data/course-guides");
const allSlugs = readdirSync(sourceDirectory)
  .filter((name) => name.endsWith(".json") && existsSync(resolve("data/gpx", `${basename(name, ".json")}.gpx`)))
  .map((name) => basename(name, ".json"))
  .sort();
const requestedSlugs = process.argv.slice(2);
const slugs = requestedSlugs.length ? requestedSlugs : allSlugs;

function buildGuide(slug: string) {
  const sourcePath = resolve(sourceDirectory, `${slug}.json`);
  const gpxPath = resolve("data/gpx", `${slug}.gpx`);
  const outputPath = resolve("src/generated/course-guides", `${slug}.json`);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as GuideSource & Record<string, unknown>;
  if (source.slug !== slug || !/^[a-z0-9-]+$/.test(source.slug)) throw new Error(`不正なslugです: ${source.slug}`);

  const parsedPoints = parseGpxPoints(readFileSync(gpxPath, "utf8"));
  const closureGapM = haversine(parsedPoints[0], parsedPoints.at(-1) ?? parsedPoints[0]);
  const usesLoopStarts = source.startPoints.some((start) => (start.routeMode ?? "loop") === "loop");
  if (usesLoopStarts && closureGapM > 250) throw new Error(`${slug}: 周回始点を生成するには閉じたGPXが必要です`);
  const points = usesLoopStarts && closureGapM > 5 ? [...parsedPoints, parsedPoints[0]] : parsedPoints;
  const result = gpxResultFromPoints(points);
  if (!result.elevationProfile) throw new Error(`${slug}: 高低図を生成できる標高データがありません`);

  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));
  function snap(target: { lat: number; lng: number }, label: string) {
    const index = points.reduce((best, point, pointIndex) => haversine(point, target) < haversine(points[best], target) ? pointIndex : best, 0);
    const gapM = Math.round(haversine(points[index], target));
    if (gapM > 150) throw new Error(`${slug}: ${label}がGPXから離れすぎています: ${gapM}m`);
    return { routePointIndex: index, routeDistanceM: Math.round(cumulative[index]), routeLat: points[index].lat, routeLng: points[index].lng, elevationM: points[index].ele === null ? null : Math.round(points[index].ele * 10) / 10, snapGapM: gapM };
  }

  const checkpoints = source.checkpoints.map((checkpoint) => ({ ...checkpoint, ...snap({ lat: checkpoint.anchorLat, lng: checkpoint.anchorLng }, checkpoint.name) }));
  const gpxDirectory = resolve("public/gpx");
  mkdirSync(gpxDirectory, { recursive: true });
  const startPoints = source.startPoints.map((start) => {
    const snapped = snap({ lat: start.routeAnchorLat, lng: start.routeAnchorLng }, start.name);
    const routeMode = start.routeMode ?? "loop";
    if (routeMode === "forward" && snapped.routeDistanceM > 250) throw new Error(`${slug}: ${start.name}のforward始点はGPX先頭から離れすぎています`);
    if (routeMode === "reverse" && result.distanceM - snapped.routeDistanceM > 250) throw new Error(`${slug}: ${start.name}のreverse始点はGPX末尾から離れすぎています`);
    const startDistanceM = routeMode === "loop" ? snapped.routeDistanceM : routeMode === "reverse" ? result.distanceM : 0;
    const transformedPoints = routeMode === "loop"
      ? rotateClosedLoopPoints(points, { lat: snapped.routeLat, lng: snapped.routeLng })
      : routeMode === "reverse" ? reversePoints(points) : points;
    const checkpointDistances = Object.fromEntries(checkpoints.map((checkpoint) => [checkpoint.id,
      routeMode === "loop"
        ? shiftRouteDistance(checkpoint.routeDistanceM, startDistanceM, result.distanceM)
        : routeMode === "reverse" ? Math.round(result.distanceM - checkpoint.routeDistanceM) : checkpoint.routeDistanceM,
    ]));
    const gpxHref = `/gpx/${source.slug}-${start.id}.gpx`;
    writeFileSync(resolve(`public${gpxHref}`), pointsToGpx(`${source.slug} (${start.name}スタート)`, transformedPoints));
    return { ...start, routeMode, ...snapped, checkpointDistances, gpxHref };
  });

  const generated = { ...source, distanceM: result.distanceM, elevationGainM: result.elevationGainM, elevationProfile: result.elevationProfile, startPoints, checkpoints };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
  console.log(JSON.stringify({ slug: source.slug, distanceKm: Number((result.distanceM / 1000).toFixed(2)), elevationGainM: result.elevationGainM, elevationSamples: result.elevationProfile.length, starts: startPoints.map(({ id, routeDistanceM, snapGapM, gpxHref }) => ({ id, routeDistanceM, snapGapM, gpxHref })), checkpoints: checkpoints.map(({ id, routeDistanceM, snapGapM }) => ({ id, routeDistanceM, snapGapM })) }, null, 2));
}

for (const slug of slugs) {
  if (!allSlugs.includes(slug)) throw new Error(`ガイドデータが見つかりません: ${slug}`);
  buildGuide(slug);
}

const registry = `${allSlugs.map((slug, index) => `import guide${index} from "./${slug}.json";`).join("\n")}\n\nexport const generatedCourseGuides = [${allSlugs.map((_, index) => `guide${index}`).join(", ")}];\n`;
writeFileSync(resolve("src/generated/course-guides/index.ts"), registry);
