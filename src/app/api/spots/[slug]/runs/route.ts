import { NextResponse } from "next/server";
import { getPublicRuns, getPublishedSpotIdBySlug } from "@/db/data";
import { avatarUrl } from "@/lib/avatars";
import { runPhotoUrl } from "@/lib/run-photos";
import { getUser } from "@/lib/user";

type Params = Promise<{ slug: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const [spotId, user] = await Promise.all([getPublishedSpotIdBySlug(slug), getUser()]);
  if (!spotId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const limit = new URL(request.url).searchParams.get("limit") === "100" ? 100 : 10;
  const runs = await getPublicRuns(spotId, limit);
  return NextResponse.json({ runs: runs.map((run) => ({
    id: run.id,
    ranAt: run.ranAt.toISOString(),
    userName: run.userName,
    userHandle: run.userHandle,
    userImageUrl: avatarUrl({ id: run.userId, image: run.userImage, customAvatarAt: run.userCustomAvatarAt }),
    comment: run.comment,
    photoUrl: run.photoKey ? runPhotoUrl(run.photoKey) : null,
    canEdit: user?.id === run.userId,
  })) }, { headers: { "Cache-Control": "private, no-store" } });
}
