type Params = Promise<{ slug: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(`/spot-gpx/${slug}.gpx`, request.url), 307);
}
