import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { pointsToGpx } from "../src/lib/gpx-export";
import { haversine, type GpxPoint } from "../src/lib/gpx";

type CoverageEntry = { slug: string; name: string; course_type: string; distanceDifferencePct?: number; issues: string[] };
type LineString = { type: "LineString"; coordinates: Array<[number, number]> };
const coverage = JSON.parse(readFileSync(resolve("data/course-guides/coverage.json"), "utf8")) as { entries: CoverageEntry[] };
const requested = new Set(process.argv.slice(2));
const entries = coverage.entries.filter((entry) =>
  (entry.issues.includes("missing_gpx") || entry.issues.includes("missing_gpx_elevation") || (entry.course_type !== "track" && (entry.distanceDifferencePct ?? 0) > 10))
  && (!requested.size || requested.has(entry.slug)),
);
const client = createClient({ url: `file:${resolve(".d1-build/prod.sqlite")}` });

async function pointsFor(entry: CoverageEntry) {
  const useDatabaseShape = entry.issues.includes("missing_gpx") || (entry.course_type !== "track" && (entry.distanceDifferencePct ?? 0) > 10);
  if (!useDatabaseShape) return parseGpxPoints(readFileSync(resolve("data/gpx", `${entry.slug}.gpx`), "utf8"));
  const result = await client.execute({ sql: `
    select c.geojson from courses c join spots s on s.id = c.spot_id
    where s.slug = ? and c.is_primary = 1 limit 1
  `, args: [entry.slug] });
  const raw = result.rows[0]?.geojson;
  if (typeof raw !== "string") throw new Error(`${entry.slug}: DBにもコース形状がありません`);
  const line = JSON.parse(raw) as LineString;
  if (line.type !== "LineString" || line.coordinates.length < 2) throw new Error(`${entry.slug}: DBのコース形状が不正です`);
  return line.coordinates.map(([lng, lat]) => ({ lat, lng, ele: null }));
}

async function elevations(points: GpxPoint[]) {
  const sampleIndices = [...new Set(Array.from({ length: Math.min(181, points.length) }, (_, index) => Math.round((index * (points.length - 1)) / (Math.min(181, points.length) - 1))))];
  const samplePoints = sampleIndices.map((index) => points[index]);
  const values: number[] = [];
  for (let offset = 0; offset < samplePoints.length; offset += 100) {
    const batch = samplePoints.slice(offset, offset + 100);
    const params = new URLSearchParams({
      latitude: batch.map((point) => point.lat).join(","),
      longitude: batch.map((point) => point.lng).join(","),
    });
    let data: { elevation?: number[] } | null = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, { signal: AbortSignal.timeout(20_000) });
      if (response.ok) {
        data = await response.json() as { elevation?: number[] };
        break;
      }
      if (response.status !== 429 || attempt === 6) throw new Error(`Open-Meteo Elevation API: ${response.status}`);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 15_000));
    }
    if (!data) throw new Error("標高を取得できませんでした");
    if (!data.elevation || data.elevation.length !== batch.length) throw new Error("標高件数が座標件数と一致しません");
    values.push(...data.elevation);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  if (samplePoints.length === points.length) return values;
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));
  return points.map((_, pointIndex) => {
    const afterSample = sampleIndices.findIndex((sampleIndex) => sampleIndex >= pointIndex);
    if (afterSample <= 0) return values[0];
    if (afterSample < 0) return values.at(-1)!;
    const beforeIndex = sampleIndices[afterSample - 1];
    const afterIndex = sampleIndices[afterSample];
    const span = cumulative[afterIndex] - cumulative[beforeIndex];
    const ratio = span ? (cumulative[pointIndex] - cumulative[beforeIndex]) / span : 0;
    return values[afterSample - 1] + (values[afterSample] - values[afterSample - 1]) * ratio;
  });
}

async function main() {
  const report = [];
  for (const entry of entries) {
    const points = await pointsFor(entry);
    const elevationValues = await elevations(points);
    const completed = points.map((point, index) => ({ ...point, ele: elevationValues[index] }));
    const xml = pointsToGpx(entry.name, completed);
    writeFileSync(resolve("data/gpx", `${entry.slug}.gpx`), xml);
    report.push({ slug: entry.slug, points: completed.length, source: entry.issues.includes("missing_gpx") || (entry.distanceDifferencePct ?? 0) > 10 ? "database_geojson" : "existing_gpx" });
    console.log(`${entry.slug}: ${completed.length}地点の標高を補完`);
  }
  const reportPath = resolve("data/course-guides/elevation-backfill.json");
  const previous = (() => {
    try { return JSON.parse(readFileSync(reportPath, "utf8")) as { entries?: typeof report }; } catch { return {}; }
  })();
  const mergedEntries = [...(previous.entries ?? []), ...report].filter((entry, index, all) => all.findLastIndex((candidate) => candidate.slug === entry.slug) === index).sort((a, b) => a.slug.localeCompare(b.slug));
  const artifact = { generatedAt: new Date().toISOString(), elevationSource: "https://open-meteo.com/en/docs/elevation-api", license: "CC BY 4.0", entries: mergedEntries };
  writeFileSync(reportPath, `${JSON.stringify(artifact, null, 2)}\n`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
