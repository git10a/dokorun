import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { haversine, type GpxPoint } from "../src/lib/gpx";
import { parseGpxPoints } from "../src/lib/gpx-node";

type CoverageEntry = {
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  access: string;
  course_type: "loop" | "out_and_back" | "one_way" | "track";
  surface?: string;
  hasGpx: boolean;
  issues: string[];
};
type Station = { name: string; prefecture: string; line: string; x: number; y: number; distance: string };
type WikimediaPage = {
  title: string;
  index?: number;
  imageinfo?: Array<{
    thumburl?: string;
    descriptionurl?: string;
    width?: number;
    height?: number;
    mime?: string;
    extmetadata?: Record<string, { value?: string | number }>;
  }>;
};

const userAgent = "DokorunCourseGuideResearch/1.0 (https://dokorun.com)";
const coverage = JSON.parse(readFileSync(resolve("data/course-guides/coverage.json"), "utf8")) as { entries: CoverageEntry[] };
const requested = new Set(process.argv.slice(2));
const entries = coverage.entries.filter((entry) => entry.hasGpx && (!requested.size || requested.has(entry.slug)));
const outputDirectory = resolve("data/course-guides/research");
mkdirSync(outputDirectory, { recursive: true });

function stripHtml(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function pointAtFraction(points: GpxPoint[], fraction: number) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));
  const target = cumulative.at(-1)! * fraction;
  const index = cumulative.findIndex((distance) => distance >= target);
  if (index <= 0) return points[0];
  if (index < 0) return points.at(-1)!;
  const before = cumulative[index - 1];
  const segment = cumulative[index] - before;
  const ratio = segment ? (target - before) / segment : 0;
  return {
    lat: points[index - 1].lat + (points[index].lat - points[index - 1].lat) * ratio,
    lng: points[index - 1].lng + (points[index].lng - points[index - 1].lng) * ratio,
    ele: points[index - 1].ele,
  };
}

async function fetchJson(url: string, attempts = 3): Promise<unknown> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(15_000) });
    if (response.ok) return response.json();
    if (attempt === attempts) throw new Error(`${response.status} ${url}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 750));
  }
  throw new Error(`取得できませんでした: ${url}`);
}

async function nearbyStations(point: GpxPoint) {
  const params = new URLSearchParams({ method: "getStations", x: String(point.lng), y: String(point.lat) });
  const data = await fetchJson(`https://express.heartrails.com/api/json?${params}`) as { response?: { station?: Station[] } };
  const seen = new Set<string>();
  return (data.response?.station ?? []).filter((station) => {
    const key = `${station.prefecture}:${station.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

async function nearbyPhotos(point: GpxPoint) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "geosearch",
    ggsprimary: "all",
    ggsnamespace: "6",
    ggsradius: "10000",
    ggslimit: "20",
    ggscoord: `${point.lat}|${point.lng}`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "960",
    origin: "*",
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`) as { query?: { pages?: Record<string, WikimediaPage> } };
  return Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 999) - (b.index ?? 999)).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata;
    const license = stripHtml(metadata?.LicenseShortName?.value);
    if (!info?.thumburl || !info.descriptionurl || !info.mime?.startsWith("image/") || (info.width ?? 0) < 640) return [];
    if (!/CC|Public domain|PDM|パブリックドメイン/i.test(license)) return [];
    if (/\b(map|logo|diagram|route|旗|地図)\b/i.test(page.title)) return [];
    return [{
      title: page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "").replaceAll("_", " "),
      description: stripHtml(metadata?.ImageDescription?.value) || page.title.replace(/^File:/, ""),
      url: info.thumburl,
      sourceUrl: info.descriptionurl,
      credit: stripHtml(metadata?.Artist?.value) || "Wikimedia Commons contributor",
      license,
      gps: metadata?.GPSLatitude?.value && metadata?.GPSLongitude?.value ? {
        lat: Number(metadata.GPSLatitude.value),
        lng: Number(metadata.GPSLongitude.value),
      } : null,
    }];
  }).slice(0, 8);
}

async function collect(entry: CoverageEntry) {
  const outputPath = resolve(outputDirectory, `${entry.slug}.json`);
  if (existsSync(outputPath) && process.env.FORCE !== "1") return { slug: entry.slug, status: "cached" };
  const points = parseGpxPoints(readFileSync(resolve("data/gpx", `${entry.slug}.gpx`), "utf8"));
  const fractions = entry.course_type === "one_way" ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.2, 0.4, 0.6, 0.8];
  const samples = fractions.map((fraction) => ({ fraction, point: pointAtFraction(points, fraction) }));
  const researched = [];
  for (const sample of samples) {
    const [stations, photos] = await Promise.all([nearbyStations(sample.point), nearbyPhotos(sample.point)]);
    researched.push({ ...sample, stations, photos });
  }
  const output = {
    slug: entry.slug,
    spot: entry,
    collectedAt: new Date().toISOString(),
    sources: {
      stations: "https://express.heartrails.com/api.html",
      photos: "https://commons.wikimedia.org/wiki/Commons:API/MediaWiki",
    },
    samples: researched,
    reviewStatus: "needs_review",
  };
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  return { slug: entry.slug, status: "collected", samples: researched.length, photos: researched.reduce((sum, item) => sum + item.photos.length, 0) };
}

async function main() {
  const results = [];
  for (let offset = 0; offset < entries.length; offset += 4) {
    const batch = await Promise.all(entries.slice(offset, offset + 4).map((entry) => collect(entry).catch((error) => ({ slug: entry.slug, status: "error", error: error instanceof Error ? error.message : String(error) }))));
    results.push(...batch);
    console.log(`[${Math.min(offset + 4, entries.length)}/${entries.length}] ${batch.map((item) => `${item.slug}:${item.status}`).join(" ")}`);
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    requested: results.length,
    total: readdirSync(outputDirectory).filter((name) => name.endsWith(".json") && !["index.json", "quality.json"].includes(name)).length,
    collected: results.filter((result) => result.status === "collected").length,
    cached: results.filter((result) => result.status === "cached").length,
    errors: results.filter((result) => result.status === "error"),
  };
  writeFileSync(resolve(outputDirectory, "index.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
