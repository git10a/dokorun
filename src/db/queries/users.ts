import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "..";
import { courses, favoriteSpots, hashiritai, runPhotos, runs, spots, userPbs, users } from "../schema";
import { addRelations, primaryCourseJoin, summarySelection } from "./spot-rows";

// ユーザー単位のデータ(マイページ・公開プロフィール)

export async function getUserHashiritai(userId: string) {
  const rows = await getDb().select(summarySelection).from(hashiritai)
    .innerJoin(spots, eq(spots.id, hashiritai.spotId))
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(hashiritai.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(hashiritai.createdAt));
  return addRelations(rows);
}

export async function getUserFavorites(userId: string) {
  const rows = await getDb().select(summarySelection).from(favoriteSpots)
    .innerJoin(spots, eq(spots.id, favoriteSpots.spotId))
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(favoriteSpots.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(favoriteSpots.createdAt));
  return addRelations(rows);
}

// スタンプ帳: 対象スポット(スタンプ画像があるもの)ごとのユーザーの走った回数。
// 相関サブクエリを避け、スポット取得とGROUP BY集計の2クエリに分ける
export async function getStampBook(userId: string, slugs: readonly string[]) {
  if (!slugs.length) return [];
  const db = getDb();
  const spotRows = await db.select({ id: spots.id, slug: spots.slug, name: spots.name, prefecture: spots.prefecture })
    .from(spots).where(and(inArray(spots.slug, [...slugs]), eq(spots.isPublished, true)));
  if (!spotRows.length) return [];
  const countRows = await db.select({ spotId: runs.spotId, runCount: count() }).from(runs)
    .where(and(eq(runs.userId, userId), inArray(runs.spotId, spotRows.map((row) => row.id))))
    .groupBy(runs.spotId);
  const countMap = new Map(countRows.map((row) => [row.spotId, row.runCount]));
  return spotRows.map(({ id, ...row }) => ({ ...row, runCount: countMap.get(id) ?? 0 }));
}

const profileSelection = {
  id: users.id,
  name: users.name,
  handle: users.handle,
  bio: users.bio,
  image: users.image,
  customAvatarAt: users.customAvatarAt,
  instagram: users.instagram,
  xHandle: users.xHandle,
  strava: users.strava,
  runningSinceYear: users.runningSinceYear,
  runningSinceMonth: users.runningSinceMonth,
};

export async function getProfileUser(handle: string) {
  const rows = await getDb().select(profileSelection).from(users).where(eq(users.handle, handle)).limit(1);
  return rows[0] ?? null;
}

// プロフィール編集ページ用: セッションのuserIdから自分のプロフィールを引く
export async function getProfileUserById(userId: string) {
  const rows = await getDb().select(profileSelection).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserPbs(userId: string) {
  return getDb().select({ event: userPbs.event, timeS: userPbs.timeS, competitionName: userPbs.competitionName }).from(userPbs)
    .where(eq(userPbs.userId, userId)).orderBy(userPbs.event);
}

const runSelection = {
  id: runs.id,
  ranAt: runs.ranAt,
  distanceM: runs.distanceM,
  durationS: runs.durationS,
  comment: runs.comment,
  photoKey: runPhotos.key,
  spotName: spots.name,
  spotSlug: spots.slug,
  courseName: courses.name,
};

export async function getPublicRunsByUser(userId: string, limit = 10) {
  return getDb().select(runSelection).from(runs)
    .innerJoin(spots, eq(spots.id, runs.spotId))
    .leftJoin(courses, eq(courses.id, runs.courseId)).leftJoin(runPhotos, eq(runPhotos.runId, runs.id))
    .where(and(eq(runs.userId, userId), eq(runs.visibility, "public"), eq(spots.isPublished, true)))
    .orderBy(desc(runs.ranAt), desc(runs.createdAt))
    .limit(limit);
}

export async function getUserRuns(userId: string) {
  return getDb().select({ ...runSelection, visibility: runs.visibility }).from(runs)
    .innerJoin(spots, eq(spots.id, runs.spotId))
    .leftJoin(courses, eq(courses.id, runs.courseId)).leftJoin(runPhotos, eq(runPhotos.runId, runs.id))
    .where(eq(runs.userId, userId)).orderBy(desc(runs.ranAt), desc(runs.createdAt));
}

export async function getUserRun(id: string, userId: string) {
  const rows = await getDb().select({
    id: runs.id, userId: runs.userId, spotId: runs.spotId, courseId: runs.courseId, ranAt: runs.ranAt,
    distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment, visibility: runs.visibility,
    photoKey: runPhotos.key,
    spotName: spots.name, spotSlug: spots.slug,
  }).from(runs).innerJoin(spots, eq(spots.id, runs.spotId)).leftJoin(runPhotos, eq(runPhotos.runId, runs.id)).where(and(eq(runs.id, id), eq(runs.userId, userId))).limit(1);
  return rows[0] ?? null;
}
