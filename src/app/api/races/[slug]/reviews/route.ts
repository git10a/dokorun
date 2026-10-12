import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { getRaceReviews } from "@/db/race-reviews";
import { raceReviews, raceReviewReports } from "@/db/schema";
import { raceBySlug } from "@/lib/races";
import { raceReviewSchema, reviewQuery } from "@/lib/race-reviews";
import { getUser } from "@/lib/user";

type Context = { params: Promise<{ slug: string }> };
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  if (!raceBySlug.has(slug)) return json({ error: "大会が見つかりません" }, 404);
  const query = reviewQuery(new URL(request.url).searchParams);
  if (!query) return json({ error: "検索条件を確認してください" }, 400);
  const result = await getRaceReviews(slug, query.target, query.offset);
  return json(result, result.available ? 200 : 503);
}

const deleteSchema = z.object({ action: z.literal("delete"), id: z.string().uuid() }).strict();
const reportSchema = z
  .object({ action: z.literal("report"), id: z.string().uuid(), reason: z.string().trim().min(1).max(500) })
  .strict();

export async function POST(request: Request, { params }: Context) {
  // Browser mutations require an exact same-origin request as well as a server session.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "送信元を確認できません" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSONで送信してください" }, 415);
  const { slug } = await params;
  const race = raceBySlug.get(slug);
  if (!race) return json({ error: "大会が見つかりません" }, 404);
  const user = await getUser();
  if (!user) return json({ error: "ログインしてください" }, 401);
  if (Number(request.headers.get("content-length")) > 10000) return json({ error: "本文が長すぎます" }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 10000) return json({ error: "本文が長すぎます" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "入力内容を確認してください" }, 400);
  }
  try {
    const db = getDb();
    const deletion = deleteSchema.safeParse(body);
    const report = reportSchema.safeParse(body);
    if (deletion.success) {
      const removed = await db
        .delete(raceReviews)
        .where(
          and(eq(raceReviews.id, deletion.data.id), eq(raceReviews.raceSlug, slug), eq(raceReviews.userId, user.id)),
        )
        .returning({ id: raceReviews.id });
      if (!removed.length) return json({ error: "削除できる投稿が見つかりません" }, 404);
    } else if (report.success) {
      const [review] = await db
        .select({ id: raceReviews.id })
        .from(raceReviews)
        .where(and(eq(raceReviews.id, report.data.id), eq(raceReviews.raceSlug, slug), eq(raceReviews.isHidden, false)))
        .limit(1);
      if (!review) return json({ error: "投稿が見つかりません" }, 404);
      await db
        .insert(raceReviewReports)
        .values({ reviewId: review.id, userId: user.id, reason: report.data.reason })
        .onConflictDoNothing();
      return json({ ok: true });
    } else {
      const parsed = raceReviewSchema(race).safeParse(body);
      if (!parsed.success)
        return json(
          {
            error:
              parsed.error.issues[0]?.message === "開催前の大会の体験は投稿できません"
                ? parsed.error.issues[0].message
                : "走った年・完走タイム・本文・地点を確認してください",
          },
          400,
        );
      // One review per race/year/user. Updating never clears a moderation decision.
      await db
        .insert(raceReviews)
        .values({ ...parsed.data, raceSlug: slug, userId: user.id })
        .onConflictDoUpdate({
          target: [raceReviews.userId, raceReviews.raceSlug, raceReviews.raceYear],
          set: {
            finishTimeS: parsed.data.finishTimeS,
            body: parsed.data.body,
            distanceKm: parsed.data.distanceKm,
            updatedAt: new Date(),
          },
        });
    }
    revalidatePath(`/races/${slug}`);
    revalidatePath("/me/race-reviews");
    return json({ ok: true });
  } catch {
    // Drizzle errors may contain bound user text; do not copy it into logs.
    console.error("Race review write failed");
    return json({ error: "保存できませんでした。時間をおいて再度お試しください" }, 503);
  }
}
