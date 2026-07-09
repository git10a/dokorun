import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from ".";
import { communities, courses, favoriteSpots, hashiritai, photos, runs, spotCommunities, spots, spotTags, tags, userPbs, users } from "./schema";
import { jstDayBounds } from "@/lib/jst";
import type { CourseType, Lighting, LineString, MapSpot, SpotSummary, Surface } from "@/lib/types";
import { simplifyLine } from "@/lib/simplify";

type SearchFilters = {
  pref?: string;
  tags?: string[];
  type?: string;
  distMin?: number;
  distMax?: number;
  q?: string;
  toilet?: boolean;
  locker?: boolean;
  sento?: boolean;
  sort?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
};

const longRunTag = { id: "virtual-long-run", slug: "long-run", name: "ロングラン", category: "terrain", sortOrder: 6 } as const;
const longRunDistanceM = 10000;

type RelationRow = {
  id: string;
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  lat: number;
  lng: number;
  hasToilet: boolean;
  hasWaterFountain: boolean;
  hasVendingMachine: boolean;
  hasLocker: boolean;
  hasShower: boolean;
  hasSentoNearby: boolean;
  hasParking: boolean;
  hasConvenienceStore: boolean;
  distanceM: number;
  elevationGainM: number | null;
  signalsCount: number | null;
  courseType: CourseType;
  surface: Surface;
  hasCourse: boolean;
};

function decorateRows<T extends RelationRow>(
  rows: T[],
  photoRows: { spotId: string; url: string; sortOrder: number }[],
  tagRows: { spotId: string; slug: string; name: string }[],
): (SpotSummary & T)[] {
  return rows.map((row) => {
    const rowTags = tagRows.filter((tag) => tag.spotId === row.id).map(({ slug, name }) => ({ slug, name }));
    const displayTags = row.distanceM >= longRunDistanceM && !rowTags.some((tag) => tag.slug === longRunTag.slug)
      ? [...rowTags, { slug: longRunTag.slug, name: longRunTag.name }]
      : rowTags;
    return {
      ...row,
      photoUrl: photoRows.find((photo) => photo.spotId === row.id)?.url ?? null,
      tags: displayTags,
    } as SpotSummary & T;
  });
}

async function addRelations<T extends RelationRow>(
  rows: T[],
  preloadedPhotoRows?: { spotId: string; url: string; sortOrder: number }[],
): Promise<(SpotSummary & T)[]> {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((row) => row.id);
  const [photoRows, tagRows] = await Promise.all([
    preloadedPhotoRows ?? db.select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos).where(inArray(photos.spotId, ids)).orderBy(photos.sortOrder),
    db.select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, ids)).orderBy(tags.sortOrder),
  ]);
  return decorateRows(rows, photoRows, tagRows);
}

const summarySelection = {
  id: spots.id,
  slug: spots.slug,
  name: spots.name,
  prefecture: spots.prefecture,
  city: spots.city,
  lat: spots.lat,
  lng: spots.lng,
  hasToilet: spots.hasToilet,
  hasWaterFountain: spots.hasWaterFountain,
  hasVendingMachine: spots.hasVendingMachine,
  hasLocker: spots.hasLocker,
  hasShower: spots.hasShower,
  hasSentoNearby: spots.hasSentoNearby,
  hasParking: spots.hasParking,
  hasConvenienceStore: spots.hasConvenienceStore,
  distanceM: courses.distanceM,
  elevationGainM: courses.elevationGainM,
  signalsCount: courses.signalsCount,
  courseType: courses.courseType,
  surface: courses.surface,
  hasCourse: sql<boolean>`coalesce(jsonb_array_length(${courses.geojson}->'coordinates') > 0, false)`,
};

export async function getTags() {
  return getDb().select().from(tags).orderBy(tags.category, tags.sortOrder);
}

export async function getSearchTags() {
  const rows = await getTags();
  const hasLongRun = rows.some((tag) => tag.slug === longRunTag.slug);
  return hasLongRun ? rows : [...rows, longRunTag];
}

// ハシリタイが集まるまでの初期表示用リスト
const popularSpotSlugs = ["kokyo", "komazawa", "osakajo", "oohori", "yoyogi"];

// トップページ用に人気/新着の行取得とphotos/tagsのバッチ取得をまとめて行う
export async function getHomeSpots(newestLimit = 8) {
  const db = getDb();
  const counted = await db.select({ spotId: hashiritai.spotId, likes: count() }).from(hashiritai)
    .innerJoin(spots, eq(spots.id, hashiritai.spotId))
    .where(eq(spots.isPublished, true))
    .groupBy(hashiritai.spotId).orderBy(desc(count())).limit(5);
  const likedIds = counted.map((row) => row.spotId);
  const condition = likedIds.length
    ? or(inArray(spots.id, likedIds), inArray(spots.slug, popularSpotSlugs))!
    : inArray(spots.slug, popularSpotSlugs);
  const [popularRows, newestRows] = await Promise.all([
    db.select(summarySelection).from(spots)
      .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
      .where(and(eq(spots.isPublished, true), condition)),
    db.select(summarySelection).from(spots)
      .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
      .where(eq(spots.isPublished, true)).orderBy(desc(spots.createdAt)).limit(newestLimit),
  ]);
  const ids = [...new Set([...popularRows, ...newestRows].map((row) => row.id))];
  const [photoRows, tagRows] = await Promise.all([
    db.select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos).where(inArray(photos.spotId, ids)).orderBy(photos.sortOrder),
    db.select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, ids)).orderBy(tags.sortOrder),
  ]);
  // ハシリタイ数の多い順を優先し、残り枠を初期リスト順で埋める
  const likeRank = new Map(likedIds.map((id, index) => [id, index]));
  const curatedRank = new Map(popularSpotSlugs.map((slug, index) => [slug, index]));
  const rank = (spot: { id: string; slug: string }) =>
    likeRank.get(spot.id) ?? likeRank.size + (curatedRank.get(spot.slug) ?? popularSpotSlugs.length);
  const popular = decorateRows(popularRows, photoRows, tagRows).sort((a, b) => rank(a) - rank(b)).slice(0, 5);
  const newest = decorateRows(newestRows, photoRows, tagRows);
  return { popular, newest };
}

export async function getUserHashiritai(userId: string) {
  const rows = await getDb().select(summarySelection).from(hashiritai)
    .innerJoin(spots, eq(spots.id, hashiritai.spotId))
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(hashiritai.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(hashiritai.createdAt));
  return addRelations(rows);
}

export async function getUserFavorites(userId: string) {
  const rows = await getDb().select(summarySelection).from(favoriteSpots)
    .innerJoin(spots, eq(spots.id, favoriteSpots.spotId))
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(favoriteSpots.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(favoriteSpots.createdAt));
  return addRelations(rows);
}

export async function getPrefectureCounts() {
  return getDb().select({ prefecture: spots.prefecture, count: count() }).from(spots)
    .where(eq(spots.isPublished, true)).groupBy(spots.prefecture).orderBy(spots.prefecture);
}

const hashiritaiCountExpr = sql`(select count(*) from ${hashiritai} where ${hashiritai.spotId} = ${spots.id})`;

// エリアハブページ用: 都道府県内の全スポットをハシリタイ数順で返す
export async function getSpotsByPrefecture(prefecture: string) {
  const rows = await getDb().select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), eq(spots.prefecture, prefecture)))
    .orderBy(desc(hashiritaiCountExpr), asc(spots.nameKana));
  return addRelations(rows);
}

// 特集ページ(/features/{slug})の絞り込み条件。スラッグは src/lib/features.ts の定義と対応する
function featureCondition(featureSlug: string): SQL | null {
  switch (featureSlug) {
    case "night-run": return eq(spots.nightLighting, "bright");
    case "no-signals": return eq(courses.signalsCount, 0);
    case "long-run": return sql`${courses.distanceM} >= ${longRunDistanceM}`;
    case "track": return or(eq(courses.courseType, "track"), sql`${spots.trackUsage}->>'publicAccess' in ('free', 'paid')`)!;
    case "water-toilet": return and(eq(spots.hasToilet, true), eq(spots.hasWaterFountain, true))!;
    case "shower": return or(eq(spots.hasShower, true), eq(spots.hasSentoNearby, true))!;
    case "parking": return eq(spots.hasParking, true);
    default: return null;
  }
}

export async function getFeatureSpots(featureSlug: string) {
  const condition = featureCondition(featureSlug);
  if (!condition) return [];
  const rows = await getDb().select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), condition))
    .orderBy(desc(hashiritaiCountExpr), asc(spots.nameKana));
  return addRelations(rows);
}

// 特集一覧ページ用: 各特集の該当件数を1クエリでまとめて取得
export async function getFeatureCounts(): Promise<Record<string, number>> {
  const rows = await getDb().select({
    nightRun: sql<number>`count(*) filter (where ${spots.nightLighting} = 'bright')::int`,
    noSignals: sql<number>`count(*) filter (where ${courses.signalsCount} = 0)::int`,
    longRun: sql<number>`count(*) filter (where ${courses.distanceM} >= ${longRunDistanceM})::int`,
    track: sql<number>`count(*) filter (where ${courses.courseType} = 'track' or ${spots.trackUsage}->>'publicAccess' in ('free', 'paid'))::int`,
    waterToilet: sql<number>`count(*) filter (where ${spots.hasToilet} and ${spots.hasWaterFountain})::int`,
    shower: sql<number>`count(*) filter (where ${spots.hasShower} or ${spots.hasSentoNearby})::int`,
    parking: sql<number>`count(*) filter (where ${spots.hasParking})::int`,
  }).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(eq(spots.isPublished, true));
  const row = rows[0];
  return {
    "night-run": row?.nightRun ?? 0,
    "no-signals": row?.noSignals ?? 0,
    "long-run": row?.longRun ?? 0,
    "track": row?.track ?? 0,
    "water-toilet": row?.waterToilet ?? 0,
    "shower": row?.shower ?? 0,
    "parking": row?.parking ?? 0,
  };
}

function searchConditions(filters: SearchFilters) {
  const conditions: SQL[] = [eq(spots.isPublished, true), eq(courses.isPrimary, true)];
  if (filters.pref) conditions.push(eq(spots.prefecture, filters.pref));
  if (filters.q) conditions.push(or(ilike(spots.name, `%${filters.q}%`), ilike(spots.nameKana, `%${filters.q}%`), ilike(spots.city, `%${filters.q}%`))!);
  if (filters.type) conditions.push(eq(courses.courseType, filters.type as CourseType));
  const selectedTagSlugs = filters.tags ?? [];
  const hasLongRunFilter = selectedTagSlugs.includes(longRunTag.slug);
  const realTagSlugs = selectedTagSlugs.filter((slug) => slug !== longRunTag.slug);
  const distanceMin = hasLongRunFilter ? Math.max(filters.distMin ?? 0, longRunDistanceM) : filters.distMin;
  if (distanceMin !== undefined) conditions.push(sql`${courses.distanceM} >= ${distanceMin}`);
  if (filters.distMax !== undefined) conditions.push(sql`${courses.distanceM} <= ${filters.distMax}`);
  if (filters.toilet) conditions.push(eq(spots.hasToilet, true));
  if (filters.locker) conditions.push(eq(spots.hasLocker, true));
  if (filters.sento) conditions.push(eq(spots.hasSentoNearby, true));
  if (realTagSlugs.length) {
    const selectedTags = inArray(tags.slug, realTagSlugs);
    conditions.push(sql`(
      select count(distinct ${tags.slug}) from ${spotTags}
      inner join ${tags} on ${tags.id} = ${spotTags.tagId}
      where ${spotTags.spotId} = ${spots.id} and ${selectedTags}
    ) = ${realTagSlugs.length}`);
  }
  return conditions;
}

// 現在地からの近似距離(緯度経度の平面近似)。数百km程度の並び替え用途には十分な精度
function nearOrderExpr(filters: SearchFilters) {
  if (filters.sort !== "near" || filters.lat === undefined || filters.lng === undefined) return null;
  const cosLat = Math.cos((filters.lat * Math.PI) / 180);
  return asc(sql`power(${spots.lat} - ${filters.lat}, 2) + power((${spots.lng} - ${filters.lng}) * ${cosLat}, 2)`);
}

export async function searchSpots(filters: SearchFilters) {
  const db = getDb();
  const conditions = searchConditions(filters);
  const limit = filters.limit ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const order = nearOrderExpr(filters) ?? (filters.sort === "distance_asc" ? asc(courses.distanceM) : filters.sort === "distance_desc" ? desc(courses.distanceM) : desc(spots.createdAt));
  const [rows, totalRows] = await Promise.all([
    db.select(summarySelection).from(spots)
      .innerJoin(courses, eq(courses.spotId, spots.id))
      .where(and(...conditions)).orderBy(order).limit(limit).offset((page - 1) * limit),
    db.select({ count: count() }).from(spots).innerJoin(courses, eq(courses.spotId, spots.id)).where(and(...conditions)),
  ]);
  return { spots: await addRelations(rows), total: totalRows[0]?.count ?? 0 };
}

export async function searchSpotsForMap(filters: SearchFilters): Promise<MapSpot[]> {
  return getDb().select({
    slug: spots.slug,
    name: spots.name,
    lat: spots.lat,
    lng: spots.lng,
    distanceM: courses.distanceM,
  }).from(spots).innerJoin(courses, eq(courses.spotId, spots.id)).where(and(...searchConditions(filters)))
    .limit(300);
}

export async function getSitemapSpots() {
  return getDb().select({ slug: spots.slug, updatedAt: spots.updatedAt }).from(spots)
    .where(eq(spots.isPublished, true)).orderBy(spots.slug);
}

function spotDetailSelection() {
  return {
    ...summarySelection,
    nameKana: spots.nameKana,
    description: spots.description,
    access: spots.access,
    nightLighting: spots.nightLighting,
    trackUsage: spots.trackUsage,
    elevationGainM: courses.elevationGainM,
    signalsCount: courses.signalsCount,
    // バックフィル済みなら簡略版だけを取り、生geojson(最大90KB級)のパースを避ける
    geojson: sql<LineString | null>`coalesce(${courses.geojsonSimplified}, ${courses.geojson})`,
    isSimplified: sql<boolean>`${courses.geojsonSimplified} is not null`,
    hashiritaiCount: sql<number>`(select count(*)::int from ${hashiritai} where ${hashiritai.spotId} = ${spots.id})`,
    runsCount: sql<number>`(select count(*)::int from ${runs} where ${runs.spotId} = ${spots.id} and ${runs.visibility} = 'public')`,
  };
}

function resolveGeojson(row: { geojson: LineString | null; isSimplified: boolean }) {
  return row.geojson
    ? (row.isSimplified ? row.geojson : { ...row.geojson, coordinates: simplifyLine(row.geojson.coordinates, 0.00005) } as LineString)
    : null;
}

export async function getSpotBySlug(slug: string) {
  const db = getDb();
  const rows = await db.select(spotDetailSelection()).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const allPhotos = await db.select().from(photos).where(eq(photos.spotId, row.id)).orderBy(photos.sortOrder);
  const photoRows = allPhotos.map(({ spotId, url, sortOrder }) => ({ spotId, url, sortOrder }));
  const [decorated] = await addRelations([row], photoRows);
  return {
    ...decorated,
    nightLighting: row.nightLighting as Lighting,
    geojson: resolveGeojson(row),
    photos: allPhotos,
  };
}

// スポット詳細ページ専用: 本体と近くのスポットのphotos/tagsを1回のクエリにまとめて取得する
export async function getSpotDetailWithNearby(slug: string) {
  const db = getDb();
  const rows = await db.select(spotDetailSelection()).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const [nearbyRows, allPhotos] = await Promise.all([
    db.select(summarySelection).from(spots)
      .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
      .where(and(eq(spots.isPublished, true), eq(spots.prefecture, row.prefecture), sql`${spots.id} <> ${row.id}`))
      .limit(4),
    db.select().from(photos).where(eq(photos.spotId, row.id)).orderBy(photos.sortOrder),
  ]);
  const nearbyIds = nearbyRows.map((nearbyRow) => nearbyRow.id);
  // メインスポットのphotosは取得済みのallPhotosから流用し、追加取得はnearby分のみ
  const [nearbyPhotoRows, tagRows] = await Promise.all([
    nearbyIds.length
      ? db.select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos).where(inArray(photos.spotId, nearbyIds)).orderBy(photos.sortOrder)
      : Promise.resolve([]),
    db.select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, [row.id, ...nearbyIds])).orderBy(tags.sortOrder),
  ]);
  const photoRows = [...allPhotos.map(({ spotId, url, sortOrder }) => ({ spotId, url, sortOrder })), ...nearbyPhotoRows];
  const [decoratedMain] = decorateRows([row], photoRows, tagRows);
  const nearby = decorateRows(nearbyRows, photoRows, tagRows);
  return {
    spot: {
      ...decoratedMain,
      nightLighting: row.nightLighting as Lighting,
      geojson: resolveGeojson(row),
      photos: allPhotos,
    },
    nearby,
  };
}

// ログイン中ユーザーのハシリタイ/お気に入り/本日のチェックイン有無を1クエリで取得
export async function getUserSpotState(spotId: string, userId: string) {
  const { start, end } = jstDayBounds();
  const rows = await getDb().select({
    isHashiritai: sql<boolean>`exists (select 1 from ${hashiritai} where ${hashiritai.spotId} = ${spotId} and ${hashiritai.userId} = ${userId})`,
    isFavorite: sql<boolean>`exists (select 1 from ${favoriteSpots} where ${favoriteSpots.spotId} = ${spotId} and ${favoriteSpots.userId} = ${userId})`,
    todayRunId: sql<string | null>`(select ${runs.id} from ${runs} where ${runs.spotId} = ${spotId} and ${runs.userId} = ${userId} and ${runs.ranAt} >= ${start} and ${runs.ranAt} < ${end} order by ${runs.createdAt} desc limit 1)`,
  }).from(users).where(eq(users.id, userId)).limit(1);
  const row = rows[0];
  return { isHashiritai: row?.isHashiritai ?? false, isFavorite: row?.isFavorite ?? false, todayRunId: row?.todayRunId ?? null };
}

export async function getSpotCourses(spotId: string) {
  return getDb().select({ id: courses.id, name: courses.name, distanceM: courses.distanceM }).from(courses)
    .where(eq(courses.spotId, spotId)).orderBy(desc(courses.isPrimary), courses.createdAt);
}

export async function getPublicRuns(spotId: string, limit = 10) {
  return getDb().select({
    id: runs.id, ranAt: runs.ranAt, distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment,
    userId: users.id, userName: users.name, userHandle: users.handle, userImage: users.image, userCustomAvatarAt: users.customAvatarAt, courseName: courses.name,
  }).from(runs).innerJoin(users, eq(users.id, runs.userId)).leftJoin(courses, eq(courses.id, runs.courseId))
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
    website: communities.website,
  }).from(spotCommunities)
    .innerJoin(communities, eq(communities.id, spotCommunities.communityId))
    .where(and(eq(spotCommunities.spotId, spotId), eq(communities.isPublished, true)))
    .orderBy(communities.createdAt);
}

export async function getAdminCommunities() {
  return getDb().select({
    id: communities.id,
    name: communities.name,
    schedule: communities.schedule,
    isPublished: communities.isPublished,
    spotCount: sql<number>`(select count(*)::int from ${spotCommunities} where ${spotCommunities.communityId} = ${communities.id})`,
  }).from(communities).orderBy(desc(communities.updatedAt));
}

export async function getAdminCommunity(id: string) {
  const db = getDb();
  const rows = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
  if (!rows[0]) return null;
  const spotRows = await db.select({ spotId: spotCommunities.spotId }).from(spotCommunities).where(eq(spotCommunities.communityId, id));
  return { ...rows[0], spotIds: spotRows.map((row) => row.spotId) };
}

// admin用: コミュニティ紐付けUIのスポット選択肢
export async function getSpotOptions() {
  return getDb().select({ id: spots.id, name: spots.name, prefecture: spots.prefecture }).from(spots)
    .orderBy(spots.prefecture, spots.nameKana);
}

export async function getProfileUser(handle: string) {
  const rows = await getDb().select({
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
  }).from(users).where(eq(users.handle, handle)).limit(1);
  return rows[0] ?? null;
}

export async function getUserPbs(userId: string) {
  return getDb().select({ event: userPbs.event, timeS: userPbs.timeS, competitionName: userPbs.competitionName }).from(userPbs)
    .where(eq(userPbs.userId, userId)).orderBy(userPbs.event);
}

export async function getPublicRunsByUser(userId: string, limit = 10) {
  return getDb().select({
    id: runs.id,
    ranAt: runs.ranAt,
    distanceM: runs.distanceM,
    durationS: runs.durationS,
    comment: runs.comment,
    spotName: spots.name,
    spotSlug: spots.slug,
    courseName: courses.name,
  }).from(runs)
    .innerJoin(spots, eq(spots.id, runs.spotId))
    .leftJoin(courses, eq(courses.id, runs.courseId))
    .where(and(eq(runs.userId, userId), eq(runs.visibility, "public"), eq(spots.isPublished, true)))
    .orderBy(desc(runs.ranAt), desc(runs.createdAt))
    .limit(limit);
}

export async function getUserRuns(userId: string) {
  return getDb().select({
    id: runs.id, ranAt: runs.ranAt, distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment,
    visibility: runs.visibility, spotName: spots.name, spotSlug: spots.slug, courseName: courses.name,
  }).from(runs).innerJoin(spots, eq(spots.id, runs.spotId)).leftJoin(courses, eq(courses.id, runs.courseId))
    .where(eq(runs.userId, userId)).orderBy(desc(runs.ranAt), desc(runs.createdAt));
}

export async function getUserRun(id: string, userId: string) {
  const rows = await getDb().select({
    id: runs.id, userId: runs.userId, spotId: runs.spotId, courseId: runs.courseId, ranAt: runs.ranAt,
    distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment, visibility: runs.visibility,
    spotName: spots.name, spotSlug: spots.slug,
  }).from(runs).innerJoin(spots, eq(spots.id, runs.spotId)).where(and(eq(runs.id, id), eq(runs.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function getAdminRuns() {
  return getDb().select({
    id: runs.id, ranAt: runs.ranAt, createdAt: runs.createdAt, distanceM: runs.distanceM, comment: runs.comment,
    visibility: runs.visibility, userName: users.name, userEmail: users.email, spotName: spots.name, spotSlug: spots.slug,
  }).from(runs).innerJoin(users, eq(users.id, runs.userId)).innerJoin(spots, eq(spots.id, runs.spotId))
    .orderBy(desc(runs.createdAt)).limit(200);
}

export async function getAdminSpots() {
  return getDb().select({ id: spots.id, name: spots.name, prefecture: spots.prefecture, distanceM: courses.distanceM, isPublished: spots.isPublished })
    .from(spots).innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true))).orderBy(desc(spots.updatedAt));
}

export async function getAdminSpot(id: string) {
  const db = getDb();
  const row = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!row[0]) return null;
  const [course, tagRows, photoRows] = await Promise.all([
    db.select().from(courses).where(and(eq(courses.spotId, id), eq(courses.isPrimary, true))).limit(1),
    db.select({ id: tags.id }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(eq(spotTags.spotId, id)),
    db.select().from(photos).where(eq(photos.spotId, id)).orderBy(photos.sortOrder),
  ]);
  return { ...row[0], course: course[0], tagIds: tagRows.map((tag) => tag.id), photos: photoRows };
}
