import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "..";
import { courses, photos, spots, spotTags, tags } from "../schema";
import { groupByMap } from "@/lib/collections";
import type { CourseType, SpotSummary, Surface } from "@/lib/types";
import { withVirtualTags } from "@/lib/virtual-tags";

// スポット一覧系クエリの共通部品(選択列・JOIN条件・写真/タグの一括付与)

// 代表コース(isPrimary)だけを結ぶ JOIN 条件
export const primaryCourseJoin = and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true));

export const summarySelection = {
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
  hasCourse: sql`coalesce(json_array_length(${courses.geojson}, '$.coordinates') > 0, 0)`.mapWith(Boolean),
};

// 相関サブクエリ。drizzle は JOIN のないクエリで sql`` 内の列をテーブル名なしで出力し、
// 外側の spots.id が内側テーブルの id に誤解決されるため、外側の列はテーブル名つきで直書きする
const outerSpotId = sql.raw(`"spots"."id"`);
// 公開用スナップショットでのビルド時は、個人データを含む hashiritai の代わりに集計済みの件数を使う
export const hashiritaiCountExpr = process.env.D1_PUBLIC_SNAPSHOT === "1"
  ? sql<number>`coalesce((select m."wanted_count" from "build_spot_metrics" m where m."spot_id" = ${outerSpotId}), 0)`
  : sql<number>`(select count(*) from "hashiritai" h where h."spot_id" = ${outerSpotId})`;
export const publicRunsCountExpr = sql<number>`(select count(*) from "runs" r where r."spot_id" = ${outerSpotId} and r."visibility" = 'public')`;

export function spotHasTag(tagSlug: string): SQL {
  return sql`exists (
    select 1 from ${spotTags}
    inner join ${tags} on ${tags.id} = ${spotTags.tagId}
    where ${spotTags.spotId} = ${spots.id} and ${tags.slug} = ${tagSlug}
  )`;
}

export type PhotoRow = { spotId: string; url: string; sortOrder: number };
export type TagRow = { spotId: string; slug: string; name: string };

type RelationRow = Omit<SpotSummary, "photoUrl" | "tags"> & { courseType: CourseType; surface: Surface };

export function loadPhotoRows(spotIds: string[]): Promise<PhotoRow[]> {
  if (!spotIds.length) return Promise.resolve([]);
  return getDb().select({ spotId: photos.spotId, url: photos.url, sortOrder: photos.sortOrder }).from(photos)
    .where(inArray(photos.spotId, spotIds)).orderBy(photos.sortOrder);
}

export function loadTagRows(spotIds: string[]): Promise<TagRow[]> {
  if (!spotIds.length) return Promise.resolve([]);
  return getDb().select({ spotId: spotTags.spotId, slug: tags.slug, name: tags.name }).from(spotTags)
    .innerJoin(tags, eq(spotTags.tagId, tags.id)).where(inArray(spotTags.spotId, spotIds)).orderBy(tags.sortOrder);
}

// 取得済みの写真・タグを各行に付ける(先頭写真をサムネイルに、仮想タグも付与)
export function decorateRows<T extends RelationRow>(rows: T[], photoRows: PhotoRow[], tagRows: TagRow[]): (SpotSummary & T)[] {
  const photosBySpot = groupByMap(photoRows, (photo) => photo.spotId);
  const tagsBySpot = groupByMap(tagRows, (tag) => tag.spotId);
  return rows.map((row) => ({
    ...row,
    photoUrl: photosBySpot.get(row.id)?.[0]?.url ?? null,
    tags: withVirtualTags((tagsBySpot.get(row.id) ?? []).map(({ slug, name }) => ({ slug, name })), row),
  }));
}

export async function addRelations<T extends RelationRow>(rows: T[]): Promise<(SpotSummary & T)[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [photoRows, tagRows] = await Promise.all([loadPhotoRows(ids), loadTagRows(ids)]);
  return decorateRows(rows, photoRows, tagRows);
}
