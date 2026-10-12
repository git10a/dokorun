import { NextResponse } from "next/server";
import { searchSpotsForMap } from "@/db/data";
import { toSearchFilters } from "@/lib/spot-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = toSearchFilters(Object.fromEntries(searchParams));
  // 地図はページ送りも並び替えもしない(一覧の検索条件だけを使う)
  const spots = await searchSpotsForMap({
    ...filters,
    sort: undefined,
    page: undefined,
    lat: undefined,
    lng: undefined,
  });
  return NextResponse.json(spots, { headers: { "Cache-Control": "public, max-age=300" } });
}
