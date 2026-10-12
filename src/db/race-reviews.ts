import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { raceReviews, users } from "@/db/schema";
import { reviewPageSize, type RaceReviewPage, type OwnRaceReview } from "@/lib/race-reviews";

// Only call from an authenticated owner route; never include these rows in a public profile.
export async function getUserRaceReviews(
  userId: string,
  offset = 0,
): Promise<{ reviews: OwnRaceReview[]; hasMore: boolean; available: boolean }> {
  try {
    const rows = await getDb()
      .select({
        id: raceReviews.id,
        raceSlug: raceReviews.raceSlug,
        raceYear: raceReviews.raceYear,
        finishTimeS: raceReviews.finishTimeS,
        body: raceReviews.body,
        distanceKm: raceReviews.distanceKm,
        isHidden: raceReviews.isHidden,
      })
      .from(raceReviews)
      .where(eq(raceReviews.userId, userId))
      .orderBy(desc(raceReviews.createdAt), desc(raceReviews.id))
      .limit(reviewPageSize + 1)
      .offset(offset);
    return { reviews: rows.slice(0, reviewPageSize), hasMore: rows.length > reviewPageSize, available: true };
  } catch {
    console.error("Own race reviews unavailable");
    return { reviews: [], hasMore: false, available: false };
  }
}

export async function getRaceReviews(slug: string, target: number | null = null, offset = 0): Promise<RaceReviewPage> {
  try {
    const rows = await getDb()
      .select({
        id: raceReviews.id,
        userId: raceReviews.userId,
        userName: users.name,
        userHandle: users.handle,
        raceYear: raceReviews.raceYear,
        finishTimeS: raceReviews.finishTimeS,
        body: raceReviews.body,
        distanceKm: raceReviews.distanceKm,
        createdAt: raceReviews.createdAt,
      })
      .from(raceReviews)
      .innerJoin(users, eq(raceReviews.userId, users.id))
      .where(
        and(
          eq(raceReviews.raceSlug, slug),
          eq(raceReviews.isHidden, false),
          target === null ? undefined : gte(raceReviews.finishTimeS, target - 900),
          target === null ? undefined : lte(raceReviews.finishTimeS, target + 900),
        ),
      )
      .orderBy(desc(raceReviews.createdAt), desc(raceReviews.id))
      .limit(reviewPageSize + 1)
      .offset(offset);
    return {
      available: true,
      nextOffset: rows.length > reviewPageSize ? offset + reviewPageSize : null,
      reviews: rows.slice(0, reviewPageSize).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    };
  } catch (error) {
    // Reviews must not take the existing race landing page offline during migration/outages.
    console.error("Race reviews unavailable", error instanceof Error ? error.message : "unknown error");
    return { available: false, reviews: [], nextOffset: null };
  }
}
