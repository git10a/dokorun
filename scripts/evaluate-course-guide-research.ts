import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { haversine } from "../src/lib/gpx";

type Photo = { title: string; description: string; gps: { lat: number; lng: number } | null; searchQuery?: string };
type Sample = { fraction: number; point: { lat: number; lng: number }; stations: Array<{ name: string; distance: string }>; photos: Photo[] };
type Research = {
  slug: string;
  spot: { name: string; prefecture: string; city: string; issues: string[] };
  samples: Sample[];
};

const directory = resolve("data/course-guides/research");
const researchFiles = readdirSync(directory).filter((name) => name.endsWith(".json") && !["index.json", "quality.json"].includes(name));
const rejectedPhotoPattern = /\b(bus|staff|t-shirt|shirt|logo|flag|aircraft|train interior|vehicle|earth|bank|post office|branch office|storefront|map)\b|バス|職員|シャツ|車両|広告|ロゴ|航空写真|地図|位置図|銀行|信用金庫|郵便局|営業所|支店/i;

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s・〜~―—ー()（）・,，.。\/]/g, "");
}

function locationKeywords(research: Research) {
  const pieces = [research.spot.name, research.spot.city.replace(/[市区町村郡].*$/, ""), research.spot.prefecture.replace(/[都道府県]$/, "")]
    .flatMap((value) => value.split(/[・〜~―—()（）\/]/))
    .map(normalize)
    .filter((value) => value.length >= 2);
  return [...new Set(pieces)];
}

function scorePhoto(photo: Photo, sample: Sample, keywords: string[]) {
  const text = normalize(`${photo.title}${photo.description}`);
  if (rejectedPhotoPattern.test(`${photo.title} ${photo.description}`)) return { score: -100, distanceM: null, reasons: ["blocked_subject"] };
  const matchedKeywords = keywords.filter((keyword) => text.includes(keyword));
  const distanceM = photo.gps ? Math.round(haversine(sample.point, photo.gps)) : null;
  let score = matchedKeywords.length * 5;
  if (photo.searchQuery) score += 5;
  if (distanceM !== null) score += distanceM <= 500 ? 6 : distanceM <= 1_500 ? 4 : distanceM <= 3_000 ? 2 : distanceM <= 7_500 ? 0 : -3;
  return { score, distanceM, reasons: [...matchedKeywords.map((keyword) => `keyword:${keyword}`), ...(photo.searchQuery ? [`commons_search:${photo.searchQuery}`] : []), distanceM === null ? "no_gps" : `distance:${distanceM}m`] };
}

const entries = researchFiles.map((filename) => {
  const research = JSON.parse(readFileSync(resolve(directory, filename), "utf8")) as Research;
  const keywords = locationKeywords(research);
  const samples = research.samples.map((sample) => {
    const rankedPhotos = sample.photos.map((photo) => ({ photo, ...scorePhoto(photo, sample, keywords) })).sort((a, b) => b.score - a.score);
    const bestPhoto = rankedPhotos[0] ?? null;
    const stationDistanceM = Number(sample.stations[0]?.distance?.replace(/[^0-9]/g, "")) || null;
    return { fraction: sample.fraction, bestPhoto, viablePhoto: Boolean(bestPhoto && bestPhoto.score >= 4), nearestStation: sample.stations[0] ?? null, stationDistanceM };
  });
  const photoCoverage = samples.filter((sample) => sample.viablePhoto).length;
  const criticalIssues = research.spot.issues.filter((issue) => ["missing_gpx", "invalid_gpx", "loop_not_closed"].includes(issue));
  const status = criticalIssues.length ? "route_fix_required" : photoCoverage >= 4 ? "ready_for_guide_generation" : "photo_research_required";
  return { slug: research.slug, name: research.spot.name, status, photoCoverage, sampleCount: samples.length, criticalIssues, samples };
});

const statusCounts = entries.reduce<Record<string, number>>((counts, entry) => {
  counts[entry.status] = (counts[entry.status] ?? 0) + 1;
  return counts;
}, {});
const report = { generatedAt: new Date().toISOString(), total: entries.length, statusCounts, entries };
writeFileSync(resolve(directory, "quality.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ total: entries.length, statusCounts, photoCoverage: Object.fromEntries([0, 1, 2, 3, 4, 5].map((count) => [count, entries.filter((entry) => entry.photoCoverage === count).length])) }, null, 2));
