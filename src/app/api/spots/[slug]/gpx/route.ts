import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { courses, spots } from "@/db/schema";
import { lineStringToGpx } from "@/lib/gpx-export";

type Params = Promise<{ slug: string }>;

export async function GET(_: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const rows = await getDb().select({ name: spots.name, geojson: courses.geojson }).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  const course = rows[0];
  if (!course?.geojson) return new Response("Not Found", { status: 404 });
  const body = lineStringToGpx(course.name, course.geojson);
  return new Response(body, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.gpx"; filename*=UTF-8''${encodeURIComponent(`${course.name}.gpx`)}`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
