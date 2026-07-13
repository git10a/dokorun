import { generatedCourseGuides } from "@/generated/course-guides";
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
  photo: { url: string; alt: string; caption: string; credit: string; license: string; sourceUrl: string };
};
export type CourseGuide = {
  slug: string;
  heroCheckpointId: string;
  intro: string;
  distanceM: number;
  elevationGainM: number | null;
  elevationProfile: ElevationSample[];
  warnings: CourseGuideWarning[];
  startPoints: CourseGuideStartPoint[];
  checkpoints: CourseGuideCheckpoint[];
};

const guides = Object.fromEntries(generatedCourseGuides.map((guide) => [guide.slug, guide as CourseGuide])) as Record<string, CourseGuide>;

export function getCourseGuide(slug: string) {
  return guides[slug] ?? null;
}
