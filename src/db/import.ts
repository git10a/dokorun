import { readFileSync } from "node:fs";
import { inArray } from "drizzle-orm";
import { config } from "dotenv";
import { z } from "zod";
import { getDb } from ".";
import { courses, spots, spotTags, tags } from "./schema";
import { prefectures } from "@/lib/prefectures";

config({ path: ".env.local" });
config();

const optionalInt = z.number().int().nullable().optional();
const importSpotSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "slugは半角英数字とハイフン"),
  name: z.string().trim().min(1),
  nameKana: z.string().trim().min(1),
  prefecture: z.string().refine((value) => (prefectures as readonly string[]).includes(value), "都道府県は正式名称(例: 東京都)"),
  city: z.string().trim().min(1),
  lat: z.number().min(20).max(46, "緯度が日本の範囲外"),
  lng: z.number().min(122).max(154, "経度が日本の範囲外"),
  description: z.string().trim().min(50, "紹介文は50字以上"),
  access: z.string().trim().nullable().optional(),
  nightLighting: z.enum(["bright", "partial", "dark"]).nullable().optional(),
  tags: z.array(z.string()).default([]),
  facilities: z.object({
    hasToilet: z.boolean().optional(), hasWaterFountain: z.boolean().optional(), hasVendingMachine: z.boolean().optional(),
    hasLocker: z.boolean().optional(), hasShower: z.boolean().optional(), hasSentoNearby: z.boolean().optional(),
    hasParking: z.boolean().optional(), hasConvenienceStore: z.boolean().optional(),
  }).default({}),
  course: z.object({
    distanceM: z.number().int().positive(),
    courseType: z.enum(["loop", "out_and_back", "one_way", "track"]),
    surface: z.enum(["asphalt", "dirt", "track", "trail", "mixed"]),
    elevationGainM: optionalInt,
    signalsCount: optionalInt,
  }),
});

const importFileSchema = z.array(importSpotSchema).min(1);

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePath = args.find((arg) => !arg.startsWith("--"));
  if (!filePath) {
    console.error("使い方: npm run db:import -- <spots.json> [--dry-run]");
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (error) {
    console.error(`JSONを読み込めませんでした: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const parsed = importFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("バリデーションエラー:");
    for (const issue of parsed.error.issues) console.error(`  [${issue.path.join(".")}] ${issue.message}`);
    process.exit(1);
  }

  const entries = parsed.data;
  const slugCounts = new Map<string, number>();
  for (const entry of entries) slugCounts.set(entry.slug, (slugCounts.get(entry.slug) ?? 0) + 1);
  const duplicated = [...slugCounts.entries()].filter(([, count]) => count > 1).map(([slug]) => slug);
  if (duplicated.length) {
    console.error(`ファイル内でslugが重複しています: ${duplicated.join(", ")}`);
    process.exit(1);
  }

  const db = getDb();
  const knownTags = await db.select({ id: tags.id, slug: tags.slug }).from(tags);
  const tagIdBySlug = new Map(knownTags.map((tag) => [tag.slug, tag.id]));
  const existing = await db.select({ slug: spots.slug }).from(spots).where(inArray(spots.slug, entries.map((entry) => entry.slug)));
  const existingSlugs = new Set(existing.map((row) => row.slug));
  const allSpots = await db.select({ slug: spots.slug, name: spots.name, lat: spots.lat, lng: spots.lng }).from(spots);

  let inserted = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const entry of entries) {
    if (existingSlugs.has(entry.slug)) {
      skipped += 1;
      console.log(`skip: ${entry.slug}(登録済み。更新は管理画面から)`);
      continue;
    }
    const unknownTags = entry.tags.filter((slug) => !tagIdBySlug.has(slug));
    if (unknownTags.length) warnings.push(`${entry.slug}: 未知のタグを無視しました → ${unknownTags.join(", ")}`);
    for (const spot of allSpots) {
      if (spot.slug === entry.slug) continue;
      const sameName = spot.name === entry.name;
      const distanceM = distanceMeters(entry.lat, entry.lng, spot.lat, spot.lng);
      if (sameName || distanceM < 500) {
        warnings.push(`${entry.slug}: 既存の「${spot.name}」(${spot.slug})と重複の可能性(${sameName ? "同名" : `約${Math.round(distanceM)}m`})。重複ならJSONから削除を`);
      }
    }
    const tagIds = entry.tags.flatMap((slug) => tagIdBySlug.has(slug) ? [tagIdBySlug.get(slug)!] : []);

    if (dryRun) {
      inserted += 1;
      console.log(`dry-run: ${entry.slug}(${entry.prefecture} ${entry.name} / ${entry.course.distanceM}m / タグ${tagIds.length}件)`);
      continue;
    }

    await db.transaction(async (tx) => {
      const [spot] = await tx.insert(spots).values({
        slug: entry.slug, name: entry.name, nameKana: entry.nameKana, prefecture: entry.prefecture, city: entry.city,
        lat: entry.lat, lng: entry.lng, description: entry.description, access: entry.access ?? null,
        nightLighting: entry.nightLighting ?? null, ...entry.facilities,
      }).returning({ id: spots.id });
      await tx.insert(courses).values({
        spotId: spot.id, geojson: null, geojsonSimplified: null, distanceM: entry.course.distanceM, courseType: entry.course.courseType,
        surface: entry.course.surface, elevationGainM: entry.course.elevationGainM ?? null, signalsCount: entry.course.signalsCount ?? null,
      });
      if (tagIds.length) await tx.insert(spotTags).values(tagIds.map((tagId) => ({ spotId: spot.id, tagId })));
    });
    inserted += 1;
    console.log(`ok: ${entry.slug}(${entry.prefecture} ${entry.name})`);
  }

  for (const warning of warnings) console.warn(`warn: ${warning}`);
  console.log(`${dryRun ? "[dry-run] " : ""}追加 ${inserted}件 / スキップ ${skipped}件 / 警告 ${warnings.length}件`);
  console.log("ルート形状(GPX)は未登録です。各スポットの編集画面からGPXをアップロードしてください。");
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
