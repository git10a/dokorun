import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "..";
import { communities, courses, photos, runs, spotCommunities, spots, spotTags, tags, users } from "../schema";
import { primaryCourseJoin } from "./spot-rows";

// 管理画面(/admin)用。公開状態に関係なく全件を見る

export async function getAdminSpots() {
  return getDb()
    .select({
      id: spots.id,
      name: spots.name,
      prefecture: spots.prefecture,
      distanceM: courses.distanceM,
      isPublished: spots.isPublished,
    })
    .from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .orderBy(desc(spots.updatedAt));
}

export async function getAdminSpot(id: string) {
  const db = getDb();
  const row = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!row[0]) return null;
  const [course, tagRows, photoRows] = await Promise.all([
    db
      .select()
      .from(courses)
      .where(and(eq(courses.spotId, id), eq(courses.isPrimary, true)))
      .limit(1),
    db
      .select({ id: tags.id })
      .from(spotTags)
      .innerJoin(tags, eq(spotTags.tagId, tags.id))
      .where(eq(spotTags.spotId, id)),
    db.select().from(photos).where(eq(photos.spotId, id)).orderBy(photos.sortOrder),
  ]);
  return { ...row[0], course: course[0], tagIds: tagRows.map((tag) => tag.id), photos: photoRows };
}

// コミュニティ紐付けUIのスポット選択肢
export async function getSpotOptions() {
  return getDb()
    .select({ id: spots.id, name: spots.name, prefecture: spots.prefecture })
    .from(spots)
    .orderBy(spots.prefecture, spots.nameKana);
}

export async function getAdminCommunities() {
  return getDb()
    .select({
      id: communities.id,
      name: communities.name,
      schedule: communities.schedule,
      isPublished: communities.isPublished,
      spotCount: count(spotCommunities.spotId),
    })
    .from(communities)
    .leftJoin(spotCommunities, eq(spotCommunities.communityId, communities.id))
    .groupBy(communities.id)
    .orderBy(desc(communities.updatedAt));
}

export async function getAdminCommunity(id: string) {
  const db = getDb();
  const rows = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
  if (!rows[0]) return null;
  const spotRows = await db
    .select({ spotId: spotCommunities.spotId })
    .from(spotCommunities)
    .where(eq(spotCommunities.communityId, id));
  return { ...rows[0], spotIds: spotRows.map((row) => row.spotId) };
}

export async function getAdminRuns() {
  return getDb()
    .select({
      id: runs.id,
      ranAt: runs.ranAt,
      createdAt: runs.createdAt,
      distanceM: runs.distanceM,
      comment: runs.comment,
      visibility: runs.visibility,
      userName: users.name,
      userEmail: users.email,
      spotName: spots.name,
      spotSlug: spots.slug,
    })
    .from(runs)
    .innerJoin(users, eq(users.id, runs.userId))
    .innerJoin(spots, eq(spots.id, runs.spotId))
    .orderBy(desc(runs.createdAt))
    .limit(200);
}
