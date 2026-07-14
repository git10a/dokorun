import { createRequire } from "node:module";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ElevationSample } from "@/lib/gpx";

export type CourseGuideWarning = { title: string; body: string; url: string; linkLabel: string };
export type CourseGuideStartPoint = {
  id: string;
  name: string;
  badge: string;
  destinationLat: number;
  destinationLng: number;
  accessText: string;
  facilitiesText: string;
  firstSection: string;
  routeDistanceM: number;
  routeLat: number;
  routeLng: number;
  elevationM: number | null;
  gpxHref: string;
  routeMode: "loop" | "forward" | "reverse";
  checkpointDistances: Record<string, number>;
};
export type CourseGuideCheckpoint = {
  id: string;
  name: string;
  description: string;
  surfaceLabel: string;
  caution: string;
  routeDistanceM: number;
  routeLat: number;
  routeLng: number;
  elevationM: number | null;
  photo?: { url: string; alt: string; caption: string; credit: string; license: string; sourceUrl: string };
};
export type CourseGuide = {
  slug: string;
  heroCheckpointId: string;
  intro: string;
  checkpointsTitle?: string;
  distanceM: number;
  elevationGainM: number | null;
  elevationProfile: ElevationSample[];
  warnings: CourseGuideWarning[];
  startPoints: CourseGuideStartPoint[];
  checkpoints: CourseGuideCheckpoint[];
};

const GENERIC_SLUG_WORDS = new Set(["city", "course", "loop", "route", "run", "running"]);
const IRRELEVANT_PHOTO_PATTERN = /(?:station|ticket.?gate|school|supermarket|restaurant|clubhouse|foundation|highway|heliport|earthquake|liquefaction|gas.?station|public.?toilet|\bsta\b|駅|改札|学校|スーパー|飲食店|クラブハウス|高速道路|ヘリポート|地震|液状化|給油所|公衆トイレ)/i;
const MANUALLY_APPROVED_PHOTO_TITLES: Record<string, string[]> = {
  "wangan-ariake-kasai": ["東京ビッグサイト panoramio"],
};

function normalizedPhotoText(value: string) {
  try {
    return decodeURIComponent(value).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
  } catch {
    return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
  }
}

export function isRelevantCoursePhoto(slug: string, checkpoint: CourseGuideCheckpoint) {
  if (!checkpoint.photo) return false;
  const sourceText = normalizedPhotoText(checkpoint.photo.sourceUrl);
  if (IRRELEVANT_PHOTO_PATTERN.test(sourceText)) return false;
  if (MANUALLY_APPROVED_PHOTO_TITLES[slug]?.some((title) => sourceText.includes(normalizedPhotoText(title)))) return true;

  const altSuffix = `の${checkpoint.name}付近`;
  const spotName = checkpoint.photo.alt.endsWith(altSuffix)
    ? checkpoint.photo.alt.slice(0, -altSuffix.length)
    : "";
  const normalizedSpotName = normalizedPhotoText(spotName).replaceAll(" ", "");
  const compactSource = sourceText.replaceAll(" ", "");
  if (normalizedSpotName.length >= 4 && compactSource.includes(normalizedSpotName)) return true;

  const slugWords = slug.split("-").filter((word) => word.length >= 4 && !GENERIC_SLUG_WORDS.has(word));
  const matchedSlugWords = slugWords.filter((word) => sourceText.includes(word));
  return slugWords.length >= 2 && matchedSlugWords.length >= Math.max(2, Math.ceil(slugWords.length * 0.6));
}

export function preparePublicCourseGuide(guide: CourseGuide): CourseGuide {
  const checkpoints = guide.checkpoints.map((checkpoint) => isRelevantCoursePhoto(guide.slug, checkpoint)
    ? checkpoint
    : {
        id: checkpoint.id,
        name: checkpoint.name,
        description: `${checkpoint.name}の走行区間です。路面は${checkpoint.surfaceLabel}。注意点は「${checkpoint.caution}」です。地図と現地案内を確認しながら走ってください。`,
        surfaceLabel: checkpoint.surfaceLabel,
        caution: checkpoint.caution,
        routeDistanceM: checkpoint.routeDistanceM,
        routeLat: checkpoint.routeLat,
        routeLng: checkpoint.routeLng,
        elevationM: checkpoint.elevationM,
      });
  return {
    ...guide,
    checkpointsTitle: checkpoints.some((checkpoint) => checkpoint.photo) ? "コースの雰囲気" : "区間ごとの確認ポイント",
    checkpoints,
  };
}

export async function getCourseGuide(slug: string): Promise<CourseGuide | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const { env } = getCloudflareContext();
    const assets = (env as CloudflareEnv).ASSETS;
    if (!assets) throw new Error("ASSETS binding is unavailable");
    const response = await assets.fetch(new Request(`https://assets.local/course-guides/${slug}.json`));
    if (!response.ok) return null;
    return preparePublicCourseGuide(await response.json() as CourseGuide);
  } catch {
    try {
      const nodeRequire = createRequire(process.cwd() + "/");
      const fs = nodeRequire("node:fs") as typeof import("node:fs");
      const path = nodeRequire("node:path") as typeof import("node:path");
      const file = path.resolve("public/course-guides", `${slug}.json`);
      if (!fs.existsSync(file)) return null;
      return preparePublicCourseGuide(JSON.parse(fs.readFileSync(file, "utf8")) as CourseGuide);
    } catch {
      return null;
    }
  }
}
