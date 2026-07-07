import { NextResponse } from "next/server";
import { searchSpotsForMap } from "@/db/data";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const distance = params.get("dist")?.split("-");
  const spots = await searchSpotsForMap({
    pref: params.get("pref") ?? undefined,
    tags: params.get("tags")?.split(",").filter(Boolean),
    type: params.get("type") ?? undefined,
    distMin: distance?.[0] ? Number(distance[0]) * 1000 : undefined,
    distMax: distance?.[1] ? Number(distance[1]) * 1000 : undefined,
    q: params.get("q") ?? undefined,
    toilet: params.get("toilet") === "1",
    locker: params.get("locker") === "1",
    sento: params.get("sento") === "1",
  });
  return NextResponse.json(spots);
}
