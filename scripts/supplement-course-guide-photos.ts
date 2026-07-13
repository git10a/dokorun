import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Photo = { title: string; description: string; url: string; sourceUrl: string; credit: string; license: string; gps: null; searchQuery?: string };
type Research = { slug: string; spot: { name: string }; samples: Array<{ photos: Photo[] }>; sources: Record<string, string>; reviewStatus: string };
const slugs = process.argv.slice(2);
if (!slugs.length) throw new Error("写真を補完するslugを指定してください");

function stripHtml(value: string | number | undefined) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

async function search(query: string) {
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "30",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "960", origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "DokorunCourseGuideResearch/1.0 (https://dokorun.com)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Wikimedia Commons API: ${response.status}`);
  const data = await response.json() as { query?: { pages?: Record<string, { title: string; index?: number; imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; width?: number; mime?: string; extmetadata?: Record<string, { value?: string | number }> }> }> } };
  return Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 999) - (b.index ?? 999)).flatMap((page): Photo[] => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata;
    const license = stripHtml(metadata?.LicenseShortName?.value);
    if (!info?.thumburl || !info.descriptionurl || !info.mime?.startsWith("image/") || (info.width ?? 0) < 640 || !/CC|Public domain|PDM/i.test(license)) return [];
    if (/\b(map|logo|diagram|route|bank|bus|post office)\b|地図|ロゴ|銀行|バス|郵便局/i.test(page.title)) return [];
    return [{
      title: page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "").replaceAll("_", " "),
      description: stripHtml(metadata?.ImageDescription?.value) || page.title.replace(/^File:/, ""),
      url: info.thumburl,
      sourceUrl: info.descriptionurl,
      credit: stripHtml(metadata?.Artist?.value) || "Wikimedia Commons contributor",
      license,
      gps: null,
      searchQuery: query,
    }];
  });
}

async function main() {
for (const slug of slugs) {
  const path = resolve("data/course-guides/research", `${slug}.json`);
  const research = JSON.parse(readFileSync(path, "utf8")) as Research;
  let photos = await search(research.spot.name);
  const shorterQuery = research.spot.name.split(/[\s（(・〜~]/)[0].trim();
  if (!photos.length && shorterQuery !== research.spot.name) photos = await search(shorterQuery);
  const existingUrls = new Set(research.samples.flatMap((sample) => sample.photos.map((photo) => photo.sourceUrl)));
  const searchedByUrl = new Map(photos.map((photo) => [photo.sourceUrl, photo]));
  research.samples.forEach((sample) => {
    sample.photos = sample.photos.map((photo) => searchedByUrl.get(photo.sourceUrl) ?? photo);
  });
  const fresh = photos.filter((photo) => !existingUrls.has(photo.sourceUrl));
  research.samples.forEach((sample, index) => {
    const photo = fresh[index];
    if (photo) sample.photos.unshift(photo);
  });
  research.sources.photoSearch = "https://commons.wikimedia.org/wiki/Commons:API/MediaWiki";
  research.reviewStatus = "needs_review";
  writeFileSync(path, `${JSON.stringify(research, null, 2)}\n`);
  console.log(`${slug}: ${fresh.length}候補を検索し、${Math.min(fresh.length, research.samples.length)}区間へ追加`);
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
