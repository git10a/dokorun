"use server";

import { and, count, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { runPhotos, runs, spots } from "@/db/schema";
import { storeRunPhoto as storePhoto, removeUnattachedRunPhoto } from "@/lib/run-photo-storage";
import { jstDayBounds, jstNoon } from "@/lib/jst";
import { containsBlockedWord } from "@/lib/moderation";
import { assertRunOwnership } from "@/lib/run-auth";
import { requireUser } from "@/lib/user";

export type RunFormState = { message?: string; errors?: Record<string, string[]> };
export type CheckInState = { message?: string };

const runSchema = z.object({
  id: z.string().uuid().optional(),
  spotId: z.string().uuid(),
  spotSlug: z.string().min(1).max(120),
  ranAt: z.string().date("走った日を入力してください"),
  comment: z.string().trim().max(500, "ひとことは500文字までです"),
  visibility: z.enum(["public", "private"]),
  returnTo: z.enum(["spot", "me"]).optional(),
});

const checkInSchema = z.object({
  spotId: z.string().uuid(),
  spotSlug: z.string().min(1).max(120),
});

function values(formData: FormData) {
  const parsed = runSchema.safeParse(Object.fromEntries(formData.entries()));
  if (parsed.success && containsBlockedWord(parsed.data.comment)) {
    return { success: false as const, error: { flatten: () => ({ fieldErrors: { comment: ["投稿できない表現が含まれています"] } }) } };
  }
  return parsed;
}

function runValues(data: z.infer<typeof runSchema>) {
  return {
    spotId: data.spotId,
    courseId: null,
    ranAt: new Date(`${data.ranAt}T12:00:00+09:00`),
    distanceM: null,
    durationS: null,
    comment: data.comment || null,
    visibility: data.visibility,
    updatedAt: new Date(),
  };
}

export async function checkInRun(_: CheckInState, formData: FormData): Promise<CheckInState> {
  const spotSlug = String(formData.get("spotSlug") ?? "");
  const user = await requireUser(`/spots/${spotSlug}?tab=logs#dokolog`);
  const parsed = checkInSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: "スポットが見つかりません" };
  const db = getDb();
  const now = new Date();
  const { start, end } = jstDayBounds(now);
  const daily = await db.select({ count: count() }).from(runs).where(and(eq(runs.userId, user.id), gte(runs.createdAt, start), lt(runs.createdAt, end)));
  if ((daily[0]?.count ?? 0) >= 20) return { message: "1日に投稿できる記録は20件までです" };
  const existing = await db.select({ id: runs.id }).from(runs)
    .where(and(eq(runs.userId, user.id), eq(runs.spotId, parsed.data.spotId), gte(runs.ranAt, start), lt(runs.ranAt, end)))
    .limit(1);
  if (existing[0]) return { message: "今日はこのスポットで記録済みです" };
  const spot = await db.select({ id: spots.id }).from(spots)
    .where(and(eq(spots.id, parsed.data.spotId), eq(spots.slug, parsed.data.spotSlug), eq(spots.isPublished, true)))
    .limit(1);
  if (!spot[0]) return { message: "スポットが見つかりません" };
  const inserted = await db.insert(runs).values({
    userId: user.id,
    spotId: parsed.data.spotId,
    courseId: null,
    ranAt: jstNoon(now),
    distanceM: null,
    durationS: null,
    comment: null,
    visibility: "public",
    updatedAt: new Date(),
  }).returning({ id: runs.id });
  revalidatePath(`/spots/${parsed.data.spotSlug}`); revalidatePath("/me/logs");
  redirect(`/spots/${parsed.data.spotSlug}?tab=logs&posted=checkin&run=${inserted[0].id}#dokolog`);
}

export async function createRun(_: RunFormState, formData: FormData): Promise<RunFormState> {
  const user = await requireUser(String(formData.get("spotSlug") ? `/spots/${formData.get("spotSlug")}/log/new` : "/me/logs"));
  const parsed = values(formData);
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const db = getDb();
  const { start, end } = jstDayBounds();
  const daily = await db.select({ count: count() }).from(runs).where(and(eq(runs.userId, user.id), gte(runs.createdAt, start), lt(runs.createdAt, end)));
  if ((daily[0]?.count ?? 0) >= 20) return { message: "1日に投稿できる記録は20件までです" };
  const spot = await db.select({ id: spots.id }).from(spots).where(and(eq(spots.id, parsed.data.spotId), eq(spots.slug, parsed.data.spotSlug), eq(spots.isPublished, true))).limit(1);
  if (!spot[0]) return { message: "スポットが見つかりません" };
  const id = crypto.randomUUID();
  let photoKey: string | null = null;
  try {
    photoKey = await storePhoto(formData.get("photo"), id);
    const insertRun = db.insert(runs).values({ id, userId: user.id, ...runValues(parsed.data) });
    if (photoKey) await db.batch([insertRun, db.insert(runPhotos).values({ runId: id, key: photoKey })]);
    else await insertRun;
  } catch {
    await removeUnattachedRunPhoto(photoKey);
    return { message: "投稿できませんでした。時間をおいて再度お試しください" };
  }
  revalidatePath(`/spots/${parsed.data.spotSlug}`); revalidatePath("/me/logs");
  redirect(`/spots/${parsed.data.spotSlug}?tab=logs&posted=1#dokolog`);
}

export async function updateRun(_: RunFormState, formData: FormData): Promise<RunFormState> {
  const user = await requireUser("/me/logs");
  const parsed = values(formData);
  if (!parsed.success || !parsed.data.id) return { message: "入力内容を確認してください", errors: parsed.success ? { id: ["記録IDがありません"] } : parsed.error.flatten().fieldErrors };
  const db = getDb();
  const current = await db.select({ userId: runs.userId }).from(runs).where(eq(runs.id, parsed.data.id)).limit(1);
  if (!current[0]) return { message: "記録が見つかりません" };
  assertRunOwnership(current[0].userId, user.id);
  const currentPhoto = await db.select({ id: runPhotos.id, key: runPhotos.key }).from(runPhotos).where(eq(runPhotos.runId, parsed.data.id)).limit(1);
  let newPhotoKey: string | null = null;
  try {
    newPhotoKey = await storePhoto(formData.get("photo"), parsed.data.id);
    const update = db.update(runs).set(runValues(parsed.data)).where(and(eq(runs.id, parsed.data.id), eq(runs.userId, user.id)));
    if (newPhotoKey) {
      const photoUpdate = currentPhoto[0]
        ? db.update(runPhotos).set({ key: newPhotoKey }).where(eq(runPhotos.id, currentPhoto[0].id))
        : db.insert(runPhotos).values({ runId: parsed.data.id, key: newPhotoKey });
      await db.batch([update, photoUpdate]);
    } else if (formData.get("removePhoto") === "true" && currentPhoto[0]) {
      await db.batch([update, db.delete(runPhotos).where(eq(runPhotos.id, currentPhoto[0].id))]);
    } else await update;
    // A DB trigger queues old objects in the same transaction; cleanup can retry safely.
  } catch {
    await removeUnattachedRunPhoto(newPhotoKey);
    return { message: "更新できませんでした。時間をおいて再度お試しください" };
  }
  revalidatePath(`/spots/${parsed.data.spotSlug}`); revalidatePath("/me/logs");
  if (parsed.data.returnTo === "spot") redirect(`/spots/${parsed.data.spotSlug}?tab=logs&posted=updated#dokolog`);
  redirect("/me/logs?success=updated");
}

export async function deleteRun(formData: FormData) {
  const user = await requireUser("/me/logs");
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return null;
  const db = getDb();
  const current = await db.select({ userId: runs.userId, spotId: runs.spotId }).from(runs).where(eq(runs.id, id)).limit(1);
  if (!current[0]) return null;
  assertRunOwnership(current[0].userId, user.id);
  await db.delete(runs).where(and(eq(runs.id, id), eq(runs.userId, user.id)));
  revalidatePath("/me/logs");
  const spot = await db.select({ slug: spots.slug }).from(spots).where(eq(spots.id, current[0].spotId)).limit(1);
  if (spot[0]) {
    revalidatePath(`/spots/${spot[0].slug}`);
    if (formData.get("returnTo") === "spot") return `/spots/${spot[0].slug}?tab=logs&posted=deleted#dokolog`;
  }
  return "/me/logs?success=deleted";
}
