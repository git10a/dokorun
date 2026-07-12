import { raceBySlug } from "@/lib/races";
import raceCourses from "@/lib/race-courses.json";
import { lineStringToGpx } from "@/lib/gpx-export";
import type { LineString } from "@/lib/types";

type Params = Promise<{ slug: string }>;
type RaceCourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const courseMeta = raceCourses as Record<string, RaceCourseMeta | undefined>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race || !courseMeta[slug]) return new Response("Not Found", { status: 404 });

  try {
    const source = await fetch(new URL(`/race-courses/${slug}.json`, request.url));
    if (!source.ok) return new Response("Not Found", { status: 404 });
    const course = await source.json() as LineString;
    if (course.type !== "LineString" || !course.coordinates?.length) return new Response("Not Found", { status: 404 });
    const body = lineStringToGpx(`${race.name} 大会コース`, course);
    return new Response(body, {
      headers: {
        "Content-Type": "application/gpx+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.gpx"; filename*=UTF-8''${encodeURIComponent(`${race.name}-大会コース.gpx`)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
