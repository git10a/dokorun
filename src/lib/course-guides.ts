import kamakuraGuide from "@/generated/course-guides/kamakura-issyu-trail.json";
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
  intro: string;
  distanceM: number;
  elevationGainM: number | null;
  elevationProfile: ElevationSample[];
  warnings: CourseGuideWarning[];
  startPoints: CourseGuideStartPoint[];
  checkpoints: CourseGuideCheckpoint[];
};

const guides: Record<string, CourseGuide> = {
  [kamakuraGuide.slug]: kamakuraGuide as CourseGuide,
};

export function getCourseGuide(slug: string) {
  return guides[slug] ?? null;
}
