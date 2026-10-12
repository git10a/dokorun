import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "..";
import { courses, spots, spotTags, tags } from "../schema";
import { features } from "@/lib/features";
import { prefectures } from "@/lib/prefectures";
import type { SearchFilters } from "@/lib/spot-search";
import { courseTypes, type CourseType, type MapSpot } from "@/lib/types";
import { castleRunSpotSlugs, castleRunTag, longRunDistanceM, longRunTag, virtualTagSlugs } from "@/lib/virtual-tags";
import { addRelations, hashiritaiCountExpr, primaryCourseJoin, spotHasTag, summarySelection } from "./spot-rows";

// 公開カタログ(検索・エリア・特集・サイトマップ)。ほとんどが unstable_cache で "public-catalog" タグにぶら下がる

// ホームで迷ったときの入口として固定表示する定番スポット
const classicSpotSlugs = ["kokyo", "komazawa", "osakajo", "oohori", "yoyogi"];

async function loadTags() {
  return getDb().select().from(tags).orderBy(tags.category, tags.sortOrder);
}

export async function getSearchTags() {
  const rows = await getTags();
  return [
    ...rows,
    ...(rows.some((tag) => tag.slug === longRunTag.slug) ? [] : [longRunTag]),
    ...(rows.some((tag) => tag.slug === castleRunTag.slug) ? [] : [castleRunTag]),
  ];
}

async function loadPrefectureCounts() {
  return getDb()
    .select({ prefecture: spots.prefecture, count: count() })
    .from(spots)
    .where(eq(spots.isPublished, true))
    .groupBy(spots.prefecture)
    .orderBy(spots.prefecture);
}

// エリアハブページ用: 都道府県内の全スポットをハシリタイ数順で返す
async function loadSpotsByPrefecture(prefecture: string) {
  const rows = await getDb()
    .select(summarySelection)
    .from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(spots.isPublished, true), eq(spots.prefecture, prefecture)))
    .orderBy(desc(hashiritaiCountExpr), asc(spots.nameKana));
  return addRelations(rows);
}

// 特集ページ(/features/{slug})の絞り込み条件。スラッグは src/lib/features.ts の定義と対応する
function featureCondition(featureSlug: string): SQL | null {
  switch (featureSlug) {
    case "morning-run":
      return spotHasTag("sunrise-view");
    case "night-run":
      return eq(spots.nightLighting, "bright");
    case "no-signals":
      return eq(courses.signalsCount, 0);
    case "long-run":
      return sql`${courses.distanceM} >= ${longRunDistanceM}`;
    case "track":
      return or(eq(courses.courseType, "track"), sql`${spots.trackUsage} is not null`)!;
    case "water-toilet":
      return and(eq(spots.hasToilet, true), eq(spots.hasWaterFountain, true))!;
    case "shower":
      return or(eq(spots.hasShower, true), eq(spots.hasSentoNearby, true))!;
    case "parking":
      return eq(spots.hasParking, true);
    default:
      return null;
  }
}

async function loadFeatureSpots(featureSlug: string) {
  const condition = featureCondition(featureSlug);
  if (!condition) return [];
  const rows = await getDb()
    .select(summarySelection)
    .from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(spots.isPublished, true), condition))
    .orderBy(desc(hashiritaiCountExpr), asc(spots.nameKana));
  return addRelations(rows);
}

// 特集一覧ページ用: 各特集の該当件数を featureCondition から組み立てた1クエリでまとめて取得
async function loadFeatureCounts(): Promise<Record<string, number>> {
  const counted = features.flatMap((feature, index) => {
    const condition = featureCondition(feature.slug);
    return condition ? [{ slug: feature.slug, key: `f${index}`, condition }] : [];
  });
  const rows = await getDb()
    .select(
      Object.fromEntries(counted.map(({ key, condition }) => [key, sql<number>`count(*) filter (where ${condition})`])),
    )
    .from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .where(eq(spots.isPublished, true));
  const row = rows[0] as Record<string, number> | undefined;
  return Object.fromEntries(counted.map(({ slug, key }) => [slug, Number(row?.[key] ?? 0)]));
}

function searchConditions(filters: SearchFilters) {
  const conditions: SQL[] = [eq(spots.isPublished, true), eq(courses.isPrimary, true)];
  if (filters.pref) conditions.push(eq(spots.prefecture, filters.pref));
  // SQLiteのLIKEはASCIIに対して大文字小文字を区別しないため、ilike相当として使える
  if (filters.q)
    conditions.push(
      or(
        like(spots.name, `%${filters.q}%`),
        like(spots.nameKana, `%${filters.q}%`),
        like(spots.city, `%${filters.q}%`),
      )!,
    );
  if (filters.type) conditions.push(eq(courses.courseType, filters.type as CourseType)); // 未知の値は0件になるだけ
  const selectedTagSlugs = filters.tags ?? [];
  const hasLongRunFilter = selectedTagSlugs.includes(longRunTag.slug);
  const hasCastleRunFilter = selectedTagSlugs.includes(castleRunTag.slug);
  const realTagSlugs = selectedTagSlugs.filter((slug) => !virtualTagSlugs.includes(slug));
  const distanceMin = hasLongRunFilter ? Math.max(filters.distMin ?? 0, longRunDistanceM) : filters.distMin;
  if (distanceMin !== undefined) conditions.push(sql`${courses.distanceM} >= ${distanceMin}`);
  if (hasCastleRunFilter) conditions.push(inArray(spots.slug, castleRunSpotSlugs));
  if (filters.distMax !== undefined) conditions.push(sql`${courses.distanceM} <= ${filters.distMax}`);
  if (filters.toilet) conditions.push(eq(spots.hasToilet, true));
  if (filters.locker) conditions.push(eq(spots.hasLocker, true));
  if (filters.sento) conditions.push(eq(spots.hasSentoNearby, true));
  if (filters.popular) conditions.push(or(sql`${hashiritaiCountExpr} > 0`, inArray(spots.slug, classicSpotSlugs))!);
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
export function nearOrderExpr(filters: SearchFilters) {
  if (filters.sort !== "near" || filters.lat === undefined || filters.lng === undefined) return null;
  const cosLat = Math.cos((filters.lat * Math.PI) / 180);
  // D1のSQLiteに数学関数が有効かはバージョン依存のため、power()を使わず乗算で書く
  return asc(
    sql`(${spots.lat} - ${filters.lat}) * (${spots.lat} - ${filters.lat}) + ((${spots.lng} - ${filters.lng}) * ${cosLat}) * ((${spots.lng} - ${filters.lng}) * ${cosLat})`,
  );
}

function searchOrder(filters: SearchFilters) {
  const near = nearOrderExpr(filters);
  if (near) return near;
  if (filters.sort === "distance_asc") return asc(courses.distanceM);
  if (filters.sort === "distance_desc") return desc(courses.distanceM);
  if (filters.sort === "popular" || (filters.popular && filters.sort !== "new")) return desc(hashiritaiCountExpr);
  return desc(spots.createdAt);
}

async function loadSearchSpots(filters: SearchFilters) {
  const db = getDb();
  const conditions = searchConditions(filters);
  const limit = filters.limit ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const [rows, totalRows] = await Promise.all([
    db
      .select(summarySelection)
      .from(spots)
      .innerJoin(courses, eq(courses.spotId, spots.id))
      .where(and(...conditions))
      .orderBy(searchOrder(filters), asc(spots.nameKana))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: count() })
      .from(spots)
      .innerJoin(courses, eq(courses.spotId, spots.id))
      .where(and(...conditions)),
  ]);
  return { spots: await addRelations(rows), total: totalRows[0]?.count ?? 0 };
}

async function loadSearchSpotsForMap(filters: SearchFilters): Promise<MapSpot[]> {
  return getDb()
    .select({
      slug: spots.slug,
      name: spots.name,
      lat: spots.lat,
      lng: spots.lng,
      distanceM: courses.distanceM,
    })
    .from(spots)
    .innerJoin(courses, eq(courses.spotId, spots.id))
    .where(and(...searchConditions(filters)))
    .limit(300);
}

export async function getSpotSummariesBySlugs(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];
  if (!uniqueSlugs.length) return [];
  const rows = await getDb()
    .select(summarySelection)
    .from(spots)
    .innerJoin(courses, primaryCourseJoin)
    .where(and(eq(spots.isPublished, true), inArray(spots.slug, uniqueSlugs)));
  return addRelations(rows);
}

async function loadSitemapSpots() {
  return getDb()
    .select({ slug: spots.slug, updatedAt: spots.updatedAt })
    .from(spots)
    .where(eq(spots.isPublished, true))
    .orderBy(spots.slug);
}

const catalogCache = { revalidate: 86400, tags: ["public-catalog"] };
export const getTags = unstable_cache(loadTags, ["public-catalog-v1", "getTags"], catalogCache);
export const getPrefectureCounts = unstable_cache(
  loadPrefectureCounts,
  ["public-catalog-v1", "getPrefectureCounts"],
  catalogCache,
);
export const getSpotsByPrefecture = unstable_cache(
  loadSpotsByPrefecture,
  ["public-catalog-v1", "getSpotsByPrefecture"],
  catalogCache,
);
export const getFeatureSpots = unstable_cache(loadFeatureSpots, ["public-catalog-v1", "getFeatureSpots"], catalogCache);
export const getFeatureCounts = unstable_cache(
  loadFeatureCounts,
  ["public-catalog-v1", "getFeatureCounts"],
  catalogCache,
);
export const getSitemapSpots = unstable_cache(loadSitemapSpots, ["public-catalog-v1", "getSitemapSpots"], catalogCache);

const cacheableSorts = new Set(["popular", "new", "distance_asc", "distance_desc"]);
const cacheableDistanceBounds = new Set([undefined, 0, 3000, 5000, 10000]);
const maxCacheablePage = 50;

// Arbitrary text and precise locations do not become shared persistent cache keys.
// Canonical categorical filters let different callers reuse the same public result.
// URL の値がそのままキーになるため、既知の値の組み合わせだけをキャッシュする(任意値でキャッシュを膨らませない)
async function catalogSearchFilters(filters: SearchFilters): Promise<SearchFilters | null> {
  if (filters.q || filters.lat !== undefined || filters.lng !== undefined) return null;
  if (filters.pref && !(prefectures as readonly string[]).includes(filters.pref)) return null;
  if (filters.type && !(courseTypes as readonly string[]).includes(filters.type)) return null;
  if (filters.sort && !cacheableSorts.has(filters.sort)) return null;
  if (!cacheableDistanceBounds.has(filters.distMin) || !cacheableDistanceBounds.has(filters.distMax)) return null;
  if ((filters.page ?? 1) > maxCacheablePage) return null;
  if (filters.tags?.length) {
    const knownTags = new Set((await getSearchTags()).map((tag) => tag.slug));
    if (filters.tags.length > 5 || filters.tags.some((slug) => !knownTags.has(slug))) return null;
  }
  return {
    pref: filters.pref || undefined,
    type: filters.type || undefined,
    tags: [...new Set(filters.tags ?? [])].sort(),
    distMin: filters.distMin,
    distMax: filters.distMax,
    toilet: Boolean(filters.toilet),
    locker: Boolean(filters.locker),
    sento: Boolean(filters.sento),
    popular: Boolean(filters.popular),
    sort: filters.sort || undefined,
    page: Math.max(1, Math.floor(filters.page ?? 1)),
    limit: Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20))),
  };
}
const cachedSearch = unstable_cache(loadSearchSpots, ["public-catalog-v1", "search"], {
  revalidate: 3600,
  tags: ["public-catalog"],
});
const cachedMapSearch = unstable_cache(loadSearchSpotsForMap, ["public-catalog-v1", "map"], {
  revalidate: 3600,
  tags: ["public-catalog"],
});
export async function searchSpots(filters: SearchFilters) {
  const canonical = await catalogSearchFilters(filters);
  return canonical ? cachedSearch(canonical) : loadSearchSpots(filters);
}
export async function searchSpotsForMap(filters: SearchFilters): Promise<MapSpot[]> {
  const canonical = await catalogSearchFilters(filters);
  return canonical ? cachedMapSearch(canonical) : loadSearchSpotsForMap(filters);
}

// Browser-side distance sorting needs the whole filtered catalog, not just page one.
export async function getNearbySpotCandidates(filters: SearchFilters) {
  const query = { ...filters, sort: "new", lat: undefined, lng: undefined, page: 1, limit: 100 };
  const first = await searchSpots(query);
  const all = [...first.spots];
  for (let page = 2; page <= Math.ceil(first.total / 100); page++) {
    const next = await searchSpots({ ...query, page });
    all.push(...next.spots);
  }
  return { spots: all, total: first.total };
}
