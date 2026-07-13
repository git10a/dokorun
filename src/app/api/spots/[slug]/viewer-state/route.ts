import { NextResponse } from "next/server";
import { getPublishedSpotIdBySlug, getUserSpotState } from "@/db/data";
import { getUser } from "@/lib/user";

type Params = Promise<{ slug: string }>;

export async function GET(_: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const [spotId, user] = await Promise.all([getPublishedSpotIdBySlug(slug), getUser()]);
  if (!spotId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!user) return NextResponse.json({ loggedIn: false, isHashiritai: false, isFavorite: false, todayRunId: null }, { headers: { "Cache-Control": "private, no-store" } });
  const state = await getUserSpotState(spotId, user.id);
  return NextResponse.json({ loggedIn: true, ...state }, { headers: { "Cache-Control": "private, no-store" } });
}
