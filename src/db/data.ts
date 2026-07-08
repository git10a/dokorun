import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from ".";
import { courses, hashiritai, photos, runs, spots, spotTags, tags, users } from "./schema";
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

async function addRelations<T extends {
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
}>(rows: T[]): Promise<(SpotSummary & T)[]> {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((row) => row.id);
  const [photoRows, tagRows] = await Promise.all([
    db.select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos).where(inArray(photos.spotId, ids)).orderBy(photos.sortOrder),
    db.select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, ids)).orderBy(tags.sortOrder),
  ]);
  return rows.map((row) => {
    return {
      ...row,
      photoUrl: photoRows.find((photo) => photo.spotId === row.id)?.url ?? null,
      tags: tagRows.filter((tag) => tag.spotId === row.id).map(({ slug, name }) => ({ slug, name })),
    } as SpotSummary & T;
  });
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

export async function getNewestSpots(limit = 8) {
  const rows = await getDb().select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(eq(spots.isPublished, true)).orderBy(desc(spots.createdAt)).limit(limit);
  return addRelations(rows);
}

// ハシリタイが集まるまでの初期表示用リスト
const popularSpotSlugs = ["kokyo", "komazawa", "osakajo", "oohori", "yoyogi"];

export async function getPopularSpots() {
  const db = getDb();
  const counted = await db.select({ spotId: hashiritai.spotId, likes: count() }).from(hashiritai)
    .innerJoin(spots, eq(spots.id, hashiritai.spotId))
    .where(eq(spots.isPublished, true))
    .groupBy(hashiritai.spotId).orderBy(desc(count())).limit(5);
  const likedIds = counted.map((row) => row.spotId);
  const condition = likedIds.length
    ? or(inArray(spots.id, likedIds), inArray(spots.slug, popularSpotSlugs))!
    : inArray(spots.slug, popularSpotSlugs);
  const rows = await db.select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), condition));
  const decorated = await addRelations(rows);
  // ハシリタイ数の多い順を優先し、残り枠を初期リスト順で埋める
  const likeRank = new Map(likedIds.map((id, index) => [id, index]));
  const curatedRank = new Map(popularSpotSlugs.map((slug, index) => [slug, index]));
  const rank = (spot: { id: string; slug: string }) =>
    likeRank.get(spot.id) ?? likeRank.size + (curatedRank.get(spot.slug) ?? popularSpotSlugs.length);
  return decorated.sort((a, b) => rank(a) - rank(b)).slice(0, 5);
}

export async function isHashiritaiForUser(spotId: string, userId: string) {
  const row = await getDb().select({ spotId: hashiritai.spotId }).from(hashiritai)
    .where(and(eq(hashiritai.spotId, spotId), eq(hashiritai.userId, userId))).limit(1);
  return Boolean(row[0]);
}

export async function getUserHashiritai(userId: string) {
  const rows = await getDb().select(summarySelection).from(hashiritai)
    .innerJoin(spots, eq(spots.id, hashiritai.spotId))
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(hashiritai.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(hashiritai.createdAt));
  return addRelations(rows);
}

export async function getPrefectureCounts() {
  return getDb().select({ prefecture: spots.prefecture, count: count() }).from(spots)
    .where(eq(spots.isPublished, true)).groupBy(spots.prefecture).orderBy(spots.prefecture);
}

function searchConditions(filters: SearchFilters) {
  const conditions: SQL[] = [eq(spots.isPublished, true), eq(courses.isPrimary, true)];
  if (filters.pref) conditions.push(eq(spots.prefecture, filters.pref));
  if (filters.q) conditions.push(or(ilike(spots.name, `%${filters.q}%`), ilike(spots.nameKana, `%${filters.q}%`), ilike(spots.city, `%${filters.q}%`))!);
  if (filters.type) conditions.push(eq(courses.courseType, filters.type as CourseType));
  if (filters.distMin !== undefined) conditions.push(sql`${courses.distanceM} >= ${filters.distMin}`);
  if (filters.distMax !== undefined) conditions.push(sql`${courses.distanceM} <= ${filters.distMax}`);
  if (filters.toilet) conditions.push(eq(spots.hasToilet, true));
  if (filters.locker) conditions.push(eq(spots.hasLocker, true));
  if (filters.sento) conditions.push(eq(spots.hasSentoNearby, true));
  if (filters.tags?.length) {
    const selectedTags = inArray(tags.slug, filters.tags);
    conditions.push(sql`(
      select count(distinct ${tags.slug}) from ${spotTags}
      inner join ${tags} on ${tags.id} = ${spotTags.tagId}
      where ${spotTags.spotId} = ${spots.id} and ${selectedTags}
    ) = ${filters.tags.length}`);
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

export async function getSpotBySlug(slug: string) {
  const db = getDb();
  const rows = await db.select({
    ...summarySelection,
    nameKana: spots.nameKana,
    description: spots.description,
    access: spots.access,
    nightLighting: spots.nightLighting,
    elevationGainM: courses.elevationGainM,
    signalsCount: courses.signalsCount,
    // バックフィル済みなら簡略版だけを取り、生geojson(最大90KB級)のパースを避ける
    geojson: sql<LineString | null>`coalesce(${courses.geojsonSimplified}, ${courses.geojson})`,
    isSimplified: sql<boolean>`${courses.geojsonSimplified} is not null`,
  }).from(spots).innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const geojson = row.geojson
    ? (row.isSimplified ? row.geojson : { ...row.geojson, coordinates: simplifyLine(row.geojson.coordinates, 0.00005) } as LineString)
    : null;
  const [decorated, allPhotos, hashiritaiCount, runsCount] = await Promise.all([
    addRelations([row]),
    db.select().from(photos).where(eq(photos.spotId, row.id)).orderBy(photos.sortOrder),
    db.select({ count: count() }).from(hashiritai).where(eq(hashiritai.spotId, row.id)),
    db.select({ count: count() }).from(runs).where(and(eq(runs.spotId, row.id), eq(runs.visibility, "public"))),
  ]);
  return {
    ...decorated[0],
    nightLighting: row.nightLighting as Lighting,
    geojson,
    photos: allPhotos,
    hashiritaiCount: hashiritaiCount[0]?.count ?? 0,
    runsCount: runsCount[0]?.count ?? 0,
  };
}

export async function getNearbySpots(prefecture: string, excludeId: string) {
  const rows = await getDb().select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), eq(spots.prefecture, prefecture), sql`${spots.id} <> ${excludeId}`))
    .limit(4);
  return addRelations(rows);
}

export async function getSpotCourses(spotId: string) {
  return getDb().select({ id: courses.id, name: courses.name, distanceM: courses.distanceM }).from(courses)
    .where(eq(courses.spotId, spotId)).orderBy(desc(courses.isPrimary), courses.createdAt);
}

export async function getPublicRuns(spotId: string, limit = 10) {
  return getDb().select({
    id: runs.id, ranAt: runs.ranAt, distanceM: runs.distanceM, durationS: runs.durationS, comment: runs.comment,
    userName: users.name, userImage: users.image, courseName: courses.name,
  }).from(runs).innerJoin(users, eq(users.id, runs.userId)).leftJoin(courses, eq(courses.id, runs.courseId))
    .where(and(eq(runs.spotId, spotId), eq(runs.visibility, "public"))).orderBy(desc(runs.ranAt), desc(runs.createdAt)).limit(limit);
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
