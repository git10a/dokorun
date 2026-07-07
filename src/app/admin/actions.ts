"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, withTxDb } from "@/db";
import { courses, photos, spots, spotTags, tags } from "@/db/schema";
import { createSessionToken, isAdmin, sessionCookieName } from "@/lib/auth";
import type { LineString } from "@/lib/types";

export type FormState = { message?: string; errors?: Record<string, string[]> };

const optionalNumber = z.preprocess((value) => value === "" || value === null ? null : Number(value), z.number().finite().nullable());
const spotSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "名前を入力してください"),
  nameKana: z.string().trim().min(1, "かなを入力してください"),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "slugは半角英数字とハイフンで入力してください"),
  prefecture: z.string().min(1, "都道府県を選択してください"),
  city: z.string().trim().min(1, "市区町村を入力してください"),
  lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180),
  description: z.string().trim().min(1, "紹介文を入力してください"), access: z.string().trim().optional(),
  distanceKm: z.coerce.number().positive("距離を入力してください"), elevationGainM: optionalNumber, signalsCount: optionalNumber,
  courseType: z.enum(["loop", "out_and_back", "one_way", "track"]), surface: z.enum(["asphalt", "dirt", "track", "trail", "mixed"]),
  nightLighting: z.preprocess((value) => value === "" ? null : value, z.enum(["bright", "partial", "dark"]).nullable()),
  geojson: z.string().optional(), photoUrls: z.string().optional(),
});

async function requireAdmin() {
  if (!await isAdmin()) throw new Error("認証が必要です");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return { message: "パスワードが違います" };
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) return { message: "SESSION_SECRETを32文字以上で設定してください" };
  const store = await cookies();
  store.set(sessionCookieName, await createSessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 60 * 60 });
  redirect("/admin?success=login");
}

export async function logout() {
  const store = await cookies();
  store.delete(sessionCookieName);
  redirect("/admin/login");
}

function values(formData: FormData) {
  return spotSchema.safeParse(Object.fromEntries(formData.entries()));
}

function flags(formData: FormData) {
  const checked = (name: string) => formData.get(name) === "on";
  return { hasToilet: checked("hasToilet"), hasWaterFountain: checked("hasWaterFountain"), hasVendingMachine: checked("hasVendingMachine"), hasLocker: checked("hasLocker"), hasShower: checked("hasShower"), hasSentoNearby: checked("hasSentoNearby"), hasParking: checked("hasParking"), hasConvenienceStore: checked("hasConvenienceStore"), isPublished: checked("isPublished") };
}

async function writeRelations(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], spotId: string, data: z.infer<typeof spotSchema>, formData: FormData) {
  let geojson: LineString | null = null;
  if (data.geojson) { try { geojson = JSON.parse(data.geojson) as LineString; } catch { geojson = null; } }
  await tx.insert(courses).values({ spotId, distanceM: Math.round(data.distanceKm * 1000), elevationGainM: data.elevationGainM === null ? null : Math.round(data.elevationGainM), signalsCount: data.signalsCount === null ? null : Math.round(data.signalsCount), courseType: data.courseType, surface: data.surface, geojson });
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);
  if (tagIds.length) {
    const existing = await tx.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds));
    if (existing.length) await tx.insert(spotTags).values(existing.map((tag) => ({ spotId, tagId: tag.id })));
  }
  const photoUrls = (data.photoUrls ?? "").split("\n").map((url) => url.trim()).filter(Boolean);
  if (photoUrls.length) await tx.insert(photos).values(photoUrls.map((url, sortOrder) => ({ spotId, url, sortOrder })));
}

export async function createSpot(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = values(formData);
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  try {
    await withTxDb((db) => db.transaction(async (tx) => {
      const [spot] = await tx.insert(spots).values({ name: data.name, nameKana: data.nameKana, slug: data.slug, prefecture: data.prefecture, city: data.city, lat: data.lat, lng: data.lng, description: data.description, access: data.access || null, nightLighting: data.nightLighting, ...flags(formData) }).returning({ id: spots.id });
      await writeRelations(tx, spot.id, data, formData);
    }));
  } catch (error) { return { message: error instanceof Error && error.message.includes("unique") ? "このslugはすでに使われています" : "保存できませんでした" }; }
  revalidatePath("/"); revalidatePath("/spots"); redirect("/admin?success=created");
}

export async function updateSpot(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = values(formData);
  if (!parsed.success || !parsed.data.id) return { message: "入力内容を確認してください", errors: parsed.success ? { id: ["スポットIDがありません"] } : parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  try {
    await withTxDb((db) => db.transaction(async (tx) => {
      await tx.update(spots).set({ name: data.name, nameKana: data.nameKana, slug: data.slug, prefecture: data.prefecture, city: data.city, lat: data.lat, lng: data.lng, description: data.description, access: data.access || null, nightLighting: data.nightLighting, ...flags(formData), updatedAt: new Date() }).where(eq(spots.id, data.id!));
      await tx.delete(courses).where(eq(courses.spotId, data.id!)); await tx.delete(spotTags).where(eq(spotTags.spotId, data.id!)); await tx.delete(photos).where(eq(photos.spotId, data.id!));
      await writeRelations(tx, data.id!, data, formData);
    }));
  } catch { return { message: "更新できませんでした" }; }
  revalidatePath("/"); revalidatePath("/spots"); revalidatePath(`/spots/${data.slug}`); redirect("/admin?success=updated");
}

export async function deleteSpot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (z.string().uuid().safeParse(id).success) await getDb().delete(spots).where(eq(spots.id, id));
  revalidatePath("/"); revalidatePath("/spots"); redirect("/admin?success=deleted");
}
