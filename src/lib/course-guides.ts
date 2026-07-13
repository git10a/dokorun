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

export async function getCourseGuide(slug: string): Promise<CourseGuide | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const { env } = getCloudflareContext();
    const assets = (env as CloudflareEnv).ASSETS;
    if (!assets) throw new Error("ASSETS binding is unavailable");
    const response = await assets.fetch(new Request(`https://assets.local/course-guides/${slug}.json`));
    if (!response.ok) return null;
    return await response.json() as CourseGuide;
  } catch {
    try {
      const nodeRequire = createRequire(process.cwd() + "/");
      const fs = nodeRequire("node:fs") as typeof import("node:fs");
      const path = nodeRequire("node:path") as typeof import("node:path");
      const file = path.resolve("public/course-guides", `${slug}.json`);
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, "utf8")) as CourseGuide;
    } catch {
      return null;
    }
  }
}
