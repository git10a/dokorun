import { raceBySlug } from "@/lib/races";
import raceCourses from "@/lib/race-courses.json";

type Params = Promise<{ slug: string }>;
type RaceCourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const courseMeta = raceCourses as Record<string, RaceCourseMeta | undefined>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race || !courseMeta[slug]) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(`/race-gpx/${slug}.gpx`, request.url), 307);
}
