import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "..";
import { communities, courses, favoriteSpots, hashiritai, photos, runPhotos, runs, spotCommunities, spots, users } from "../schema";
import { simplifyCourseGeojson } from "@/lib/course-geojson";
import { jstDayBounds } from "@/lib/jst";
import type { LineString } from "@/lib/types";
import { nearOrderExpr } from "./catalog";
import { decorateRows, hashiritaiCountExpr, loadPhotoRows, loadTagRows, primaryCourseJoin, publicRunsCountExpr, summarySelection } from "./spot-rows";

// スポット詳細ページ(/spots/{slug})まわり

const detailSelection = {
  ...summarySelection,
  nameKana: spots.nameKana,
  description: spots.description,
  access: spots.access,
  nightLighting: spots.nightLighting,
  trackUsage: spots.trackUsage,
  // バックフィル済みなら簡略版だけを取り、生geojson(最大90KB級)のパースを避ける。
  // 生SQL経由はカラムのjsonモード変換が効かないため、明示的にパースする
  geojson: sql`coalesce(${courses.geojsonSimplified}, ${courses.geojson})`
    .mapWith((value: string | null) => (value ? (JSON.parse(value) as LineString) : null)),
  isSimplified: sql`${courses.geojsonSimplified} is not null`.mapWith(Boolean),
  hashiritaiCount: hashiritaiCountExpr,
  runsCount: publicRunsCountExpr,
};

async function loadSpotDetailRow(slug: string) {
  const [row] = await getDb().select(detailSelection).from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  return row ?? null;
}

// 詳細表示用の写真は全列を返す
function loadAllPhotos(spotId: string) {
  return getDb().select().from(photos).where(eq(photos.spotId, spotId)).orderBy(photos.sortOrder);
}

function toSpotDetail<T extends { geojson: LineString | null; isSimplified: boolean }>(decorated: T, allPhotos: (typeof photos.$inferSelect)[]) {
  return {
    ...decorated,
    geojson: decorated.isSimplified ? decorated.geojson : simplifyCourseGeojson(decorated.geojson),
    photos: allPhotos,
  };
}

export async function getSpotBySlug(slug: string) {
  const row = await loadSpotDetailRow(slug);
  if (!row) return null;
  const [allPhotos, tagRows] = await Promise.all([loadAllPhotos(row.id), loadTagRows([row.id])]);
  const [decorated] = decorateRows([row], allPhotos, tagRows);
  return toSpotDetail(decorated, allPhotos);
}

// スポット詳細ページ専用: 本体と近くのスポットのphotos/tagsをまとめて取得する
export async function getSpotDetailWithNearby(slug: string) {
  const row = await loadSpotDetailRow(slug);
  if (!row) return null;
  const [nearbyRows, allPhotos] = await Promise.all([
    getDb().select(summarySelection).from(spots)
      .innerJoin(courses, primaryCourseJoin)
      .where(and(eq(spots.isPublished, true), eq(spots.prefecture, row.prefecture), sql`${spots.id} <> ${row.id}`))
      .orderBy(nearOrderExpr({ sort: "near", lat: row.lat, lng: row.lng })!)
      .limit(4),
    loadAllPhotos(row.id),
  ]);
  const nearbyIds = nearbyRows.map((nearbyRow) => nearbyRow.id);
  // メインスポットの写真は取得済みのallPhotosを流用し、追加取得はnearby分のみ
  const [nearbyPhotoRows, tagRows] = await Promise.all([loadPhotoRows(nearbyIds), loadTagRows([row.id, ...nearbyIds])]);
  const photoRows = [...allPhotos, ...nearbyPhotoRows];
  const [decoratedMain] = decorateRows([row], photoRows, tagRows);
  return {
    spot: toSpotDetail(decoratedMain, allPhotos),
    nearby: decorateRows(nearbyRows, photoRows, tagRows),
  };
}

export async function getPublishedSpotIdBySlug(slug: string) {
  const rows = await getDb().select({ id: spots.id }).from(spots)
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  return rows[0]?.id ?? null;
}

// ログイン中ユーザーのハシリタイ/お気に入り/本日のチェックイン有無を1クエリで取得
export async function getUserSpotState(spotId: string, userId: string) {
  const { start, end } = jstDayBounds();
  const rows = await getDb().select({
    isHashiritai: sql`exists (select 1 from ${hashiritai} where ${hashiritai.spotId} = ${spotId} and ${hashiritai.userId} = ${userId})`.mapWith(Boolean),
    isFavorite: sql`exists (select 1 from ${favoriteSpots} where ${favoriteSpots.spotId} = ${spotId} and ${favoriteSpots.userId} = ${userId})`.mapWith(Boolean),
    // ran_atはUNIXミリ秒のinteger。生SQLの引数はカラム型変換が効かないため数値で渡す
    todayRunId: sql<string | null>`(select ${runs.id} from ${runs} where ${runs.spotId} = ${spotId} and ${runs.userId} = ${userId} and ${runs.ranAt} >= ${start.getTime()} and ${runs.ranAt} < ${end.getTime()} order by ${runs.createdAt} desc limit 1)`,
  }).from(users).where(eq(users.id, userId)).limit(1);
  const row = rows[0];
  return { isHashiritai: row?.isHashiritai ?? false, isFavorite: row?.isFavorite ?? false, todayRunId: row?.todayRunId ?? null };
}

export async function getPublicRuns(spotId: string, limit = 10) {
  return getDb().select({
    id: runs.id, ranAt: runs.ranAt, distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment,
    photoKey: runPhotos.key,
    userId: users.id, userName: users.name, userHandle: users.handle, userImage: users.image, userCustomAvatarAt: users.customAvatarAt, courseName: courses.name,
  }).from(runs).innerJoin(users, eq(users.id, runs.userId)).leftJoin(courses, eq(courses.id, runs.courseId)).leftJoin(runPhotos, eq(runPhotos.runId, runs.id))
    .where(and(eq(runs.spotId, spotId), eq(runs.visibility, "public"))).orderBy(desc(runs.ranAt), desc(runs.createdAt)).limit(limit);
}

export async function getSpotCommunities(spotId: string) {
  return getDb().select({
    id: communities.id,
    name: communities.name,
    description: communities.description,
    schedule: communities.schedule,
    instagram: communities.instagram,
    xHandle: communities.xHandle,
    strava: communities.strava,
    website: communities.website,
    logoUrl: communities.logoUrl,
  }).from(spotCommunities)
    .innerJoin(communities, eq(communities.id, spotCommunities.communityId))
    .where(and(eq(spotCommunities.spotId, spotId), eq(communities.isPublished, true)))
    .orderBy(communities.createdAt);
}
