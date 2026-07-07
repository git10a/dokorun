import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from ".";
import { courses, hashiritai, photos, runs, spots, spotTags, tags } from "./schema";
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
  courseGeojson: LineString | null;
}>(rows: T[]): Promise<(SpotSummary & Omit<T, "courseGeojson">)[]> {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((row) => row.id);
  const [photoRows, tagRows] = await Promise.all([
    db.select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos).where(inArray(photos.spotId, ids)).orderBy(photos.sortOrder),
    db.select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags).innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, ids)).orderBy(tags.sortOrder),
  ]);
  return rows.map((row) => {
    const { courseGeojson, ...summary } = row;
    return {
      ...summary,
      hasCourse: Boolean(courseGeojson?.coordinates?.length),
      photoUrl: photoRows.find((photo) => photo.spotId === row.id)?.url ?? null,
      tags: tagRows.filter((tag) => tag.spotId === row.id).map(({ slug, name }) => ({ slug, name })),
    } as SpotSummary & Omit<T, "courseGeojson">;
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
  courseGeojson: courses.geojson,
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

const popularSpotSlugs = ["kokyo", "komazawa", "osakajo", "oohori", "yoyogi"] as const;

export async function getPopularSpots() {
  const rows = await getDb().select(summarySelection).from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), inArray(spots.slug, popularSpotSlugs)));
  const decorated = await addRelations(rows);
  const order = new Map<string, number>(popularSpotSlugs.map((slug, index) => [slug, index]));
  return decorated.sort((a, b) => (order.get(a.slug) ?? Infinity) - (order.get(b.slug) ?? Infinity));
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

export async function searchSpots(filters: SearchFilters) {
  const db = getDb();
  const conditions = searchConditions(filters);
  const limit = filters.limit ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const order = filters.sort === "distance_asc" ? asc(courses.distanceM) : filters.sort === "distance_desc" ? desc(courses.distanceM) : desc(spots.createdAt);
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
    geojson: courses.geojson,
  }).from(spots).innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.slug, slug), eq(spots.isPublished, true))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const [decorated, allPhotos, hashiritaiCount, runsCount] = await Promise.all([
    addRelations([{ ...row, courseGeojson: row.geojson }]),
    db.select().from(photos).where(eq(photos.spotId, row.id)).orderBy(photos.sortOrder),
    db.select({ count: count() }).from(hashiritai).where(eq(hashiritai.spotId, row.id)),
    db.select({ count: count() }).from(runs).where(eq(runs.spotId, row.id)),
  ]);
  return {
    ...decorated[0],
    nightLighting: row.nightLighting as Lighting,
    geojson: row.geojson ? { ...row.geojson, coordinates: simplifyLine(row.geojson.coordinates, 0.00005) } as LineString : null,
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
