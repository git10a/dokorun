"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb, isUniqueViolation, runAtomically } from "@/db";
import { courses, feedback, photos, runs, spots, spotTags, tags } from "@/db/schema";
import { createSessionToken, requireAdmin, sessionCookieName } from "@/lib/auth";
import { simplifyCourseGeojson } from "@/lib/course-geojson";
import { revalidateSpotCatalog } from "@/lib/revalidate";
import { courseTypes, facilitiesFromForm, lightings, surfaces, type LineString } from "@/lib/types";

export type FormState = { message?: string; errors?: Record<string, string[]> };

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? null : Number(value)),
  z.number().finite().nullable(),
);
const spotSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "名前を入力してください"),
  nameKana: z.string().trim().min(1, "かなを入力してください"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "slugは半角英数字とハイフンで入力してください"),
  prefecture: z.string().min(1, "都道府県を選択してください"),
  city: z.string().trim().min(1, "市区町村を入力してください"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  description: z.string().trim().min(1, "紹介文を入力してください"),
  access: z.string().trim().optional(),
  distanceKm: z.coerce.number().positive("距離を入力してください"),
  elevationGainM: optionalNumber,
  signalsCount: optionalNumber,
  courseType: z.enum(courseTypes),
  surface: z.enum(surfaces),
  nightLighting: z.preprocess((value) => (value === "" ? null : value), z.enum(lightings).nullable()),
  geojson: z.string().optional(),
  photoUrls: z.string().optional(),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD)
    return { message: "パスワードが違います" };
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    return { message: "SESSION_SECRETを32文字以上で設定してください" };
  const store = await cookies();
  store.set(sessionCookieName, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect("/admin?success=login");
}

export async function logout() {
  const store = await cookies();
  store.delete(sessionCookieName);
  redirect("/admin/login");
}

type SpotInput = z.infer<typeof spotSchema>;

function values(formData: FormData) {
  return spotSchema.safeParse(Object.fromEntries(formData.entries()));
}

function flags(formData: FormData) {
  return { ...facilitiesFromForm(formData), isPublished: formData.get("isPublished") === "on" };
}

function spotFields(data: SpotInput, formData: FormData) {
  return {
    name: data.name,
    nameKana: data.nameKana,
    slug: data.slug,
    prefecture: data.prefecture,
    city: data.city,
    lat: data.lat,
    lng: data.lng,
    description: data.description,
    access: data.access || null,
    nightLighting: data.nightLighting,
    ...flags(formData),
  };
}

// コース・タグ・写真の insert 文を組み立てる(実行は呼び出し側の batch でまとめて行う)
async function relationStatements(spotId: string, data: SpotInput, formData: FormData): Promise<BatchItem<"sqlite">[]> {
  const db = getDb();
  let geojson: LineString | null = null;
  if (data.geojson) {
    try {
      geojson = JSON.parse(data.geojson) as LineString;
    } catch {
      geojson = null;
    }
  }
  const statements: BatchItem<"sqlite">[] = [
    db.insert(courses).values({
      spotId,
      distanceM: Math.round(data.distanceKm * 1000),
      elevationGainM: data.elevationGainM === null ? null : Math.round(data.elevationGainM),
      signalsCount: data.signalsCount === null ? null : Math.round(data.signalsCount),
      courseType: data.courseType,
      surface: data.surface,
      geojson,
      geojsonSimplified: simplifyCourseGeojson(geojson),
    }),
  ];
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);
  const existingTags = tagIds.length ? await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds)) : [];
  if (existingTags.length)
    statements.push(db.insert(spotTags).values(existingTags.map((tag) => ({ spotId, tagId: tag.id }))));
  const photoUrls = (data.photoUrls ?? "")
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
  if (photoUrls.length)
    statements.push(db.insert(photos).values(photoUrls.map((url, sortOrder) => ({ spotId, url, sortOrder }))));
  return statements;
}

export async function createSpot(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = values(formData);
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  try {
    const spotId = crypto.randomUUID();
    await runAtomically([
      getDb()
        .insert(spots)
        .values({ id: spotId, ...spotFields(data, formData) }),
      ...(await relationStatements(spotId, data, formData)),
    ]);
  } catch (error) {
    return { message: isUniqueViolation(error) ? "このslugはすでに使われています" : "保存できませんでした" };
  }
  revalidateSpotCatalog(data.slug);
  redirect("/admin?success=created");
}

export async function updateSpot(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = values(formData);
  if (!parsed.success || !parsed.data.id)
    return {
      message: "入力内容を確認してください",
      errors: parsed.success ? { id: ["スポットIDがありません"] } : parsed.error.flatten().fieldErrors,
    };
  const data = parsed.data;
  const spotId = data.id!;
  const db = getDb();
  const previous = (await db.select({ slug: spots.slug }).from(spots).where(eq(spots.id, spotId)).limit(1))[0];
  try {
    // 付け替え(delete→insert)を1バッチにして、途中失敗でコース・タグ・写真が消えたままにならないようにする
    await runAtomically([
      db
        .update(spots)
        .set({ ...spotFields(data, formData), updatedAt: new Date() })
        .where(eq(spots.id, spotId)),
      db.delete(courses).where(eq(courses.spotId, spotId)),
      db.delete(spotTags).where(eq(spotTags.spotId, spotId)),
      db.delete(photos).where(eq(photos.spotId, spotId)),
      ...(await relationStatements(spotId, data, formData)),
    ]);
  } catch {
    return { message: "更新できませんでした" };
  }
  revalidateSpotCatalog(data.slug);
  if (previous && previous.slug !== data.slug) revalidatePath(`/spots/${previous.slug}`);
  redirect("/admin?success=updated");
}

export async function deleteSpot(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (z.string().uuid().safeParse(id).success) {
    const [deleted] = await getDb().delete(spots).where(eq(spots.id, id)).returning({ slug: spots.slug });
    revalidateSpotCatalog(deleted?.slug);
  }
  redirect("/admin?success=deleted");
}

export async function deleteRunAsAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const db = getDb();
  const target = await db.select({ spotId: runs.spotId }).from(runs).where(eq(runs.id, id)).limit(1);
  await db.delete(runs).where(eq(runs.id, id));
  revalidatePath("/admin/logs");
  if (target[0]) {
    const spot = await db.select({ slug: spots.slug }).from(spots).where(eq(spots.id, target[0].spotId)).limit(1);
    if (spot[0]) revalidatePath(`/spots/${spot[0].slug}`);
  }
}

export async function deleteFeedbackAsAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  await getDb().delete(feedback).where(eq(feedback.id, id));
  revalidatePath("/admin/feedback");
}
