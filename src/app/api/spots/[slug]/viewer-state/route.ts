import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getPublishedSpotIdBySlug, getUserSpotState } from "@/db/data";
import { getUser } from "@/lib/user";

type Params = Promise<{ slug: string }>;

const noStore = { "Cache-Control": "private, no-store" };
const loggedOut = { loggedIn: false, isFavorite: false, todayRunId: null };

export async function GET(request: Request, { params }: { params: Params }) {
  // セッションcookieの無い匿名アクセスはD1を引かずに返す（存在しないslugも404にせず未ログイン扱い）
  if (!getSessionCookie(request, { cookiePrefix: "dokorun" }))
    return NextResponse.json(loggedOut, { headers: noStore });
  const { slug } = await params;
  const [spotId, user] = await Promise.all([getPublishedSpotIdBySlug(slug), getUser()]);
  if (!spotId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!user) return NextResponse.json(loggedOut, { headers: noStore });
  const state = await getUserSpotState(spotId, user.id);
  return NextResponse.json({ loggedIn: true, ...state }, { headers: noStore });
}
