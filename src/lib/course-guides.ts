import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ElevationSample } from "@/lib/gpx";
import { spotEditorial } from "@/lib/course-editorial";
import coursePhotoReviews from "@/lib/course-photo-reviews.json";
import { courseAtmospheres, type CourseAtmosphere } from "@/lib/course-atmosphere";

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
  elevationGapNotice?: string;
  routeUnavailable?: CourseGuideWarning;
  warnings: CourseGuideWarning[];
  startPoints: CourseGuideStartPoint[];
  checkpoints: CourseGuideCheckpoint[];
  atmosphere?: CourseAtmosphere;
};

// Nearby search results are research candidates, not evidence of a course view.
// A review is specific to the course, landmark, source page and displayed image.
// Keep reviews outside generated JSON so regeneration cannot grant approval.
const photoReviews: Record<
  string,
  Record<string, { sourceUrl: string; imageUrl: string; checkedAt: string }>
> = coursePhotoReviews;

export function isReviewedCoursePhoto(slug: string, checkpoint: CourseGuideCheckpoint) {
  const review = photoReviews[slug]?.[checkpoint.id];
  return Boolean(
    checkpoint.photo &&
      review &&
      checkpoint.photo.sourceUrl === review.sourceUrl &&
      checkpoint.photo.url === review.imageUrl,
  );
}

export function preparePublicCourseGuide(guide: CourseGuide): CourseGuide {
  const editorial = spotEditorial[guide.slug];
  const seenPhotos = new Set<string>();
  const checkpoints = guide.checkpoints.map((checkpoint) => {
    const { photo, ...point } = checkpoint;
    if (
      photo &&
      !editorial?.hideUnverifiedPhotos &&
      isReviewedCoursePhoto(guide.slug, checkpoint) &&
      !seenPhotos.has(photo.sourceUrl)
    ) {
      seenPhotos.add(photo.sourceUrl);
      return checkpoint;
    }
    return {
      ...point,
      // Photo-derived prose is not a route description. Do not publish it after
      // rejecting the image, and do not replace it with five generic warnings.
      description: point.description.includes("写真") ? "" : point.description,
    };
  });
  return {
    ...guide,
    atmosphere: courseAtmospheres[guide.slug],
    intro: editorial?.intro ?? guide.intro,
    warnings: editorial?.notice ? [editorial.notice, ...guide.warnings] : guide.warnings,
    checkpointsTitle: checkpoints.some((checkpoint) => checkpoint.photo) ? "コースの雰囲気" : "区間ごとの確認ポイント",
    checkpoints,
  };
}

function loadLocalCourseGuide(slug: string): CourseGuide | null {
  // Build and dev must read this checkout, not an ASSETS binding from an older build.
  // Keep Node-only file loading opaque to the server bundler.
  const nodeRequire = process.getBuiltinModule("module").createRequire(process.cwd() + "/");
  const fs = nodeRequire("node:fs") as typeof import("node:fs");
  const path = nodeRequire("node:path") as typeof import("node:path");
  const file = path.resolve("public/course-guides", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return preparePublicCourseGuide(JSON.parse(fs.readFileSync(file, "utf8")) as CourseGuide);
}

export async function getCourseGuide(slug: string): Promise<CourseGuide | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (globalThis.navigator?.userAgent !== "Cloudflare-Workers") {
    try {
      return loadLocalCourseGuide(slug);
    } catch {
      return null;
    }
  }
  try {
    const { env } = getCloudflareContext();
    const assets = (env as CloudflareEnv).ASSETS;
    if (!assets) return null;
    const response = await assets.fetch(new Request(`https://assets.local/course-guides/${slug}.json`));
    if (!response.ok) return null;
    return preparePublicCourseGuide((await response.json()) as CourseGuide);
  } catch {
    return null;
  }
}
