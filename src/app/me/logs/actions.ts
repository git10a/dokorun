"use server";

import { and, count, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { runs, spots } from "@/db/schema";
import { assertRunOwnership } from "@/lib/run-auth";
import { requireUser } from "@/lib/user";

export type RunFormState = { message?: string; errors?: Record<string, string[]> };

const runSchema = z.object({
  id: z.string().uuid().optional(),
  spotId: z.string().uuid(),
  spotSlug: z.string().min(1).max(120),
  ranAt: z.string().date("走った日を入力してください"),
  comment: z.string().trim().max(500, "ひとことは500文字までです"),
  visibility: z.enum(["public", "private"]),
  returnTo: z.enum(["spot", "me"]).optional(),
});

const blockedWords = ["死ね", "殺す", "消えろ", "ばか"];

function values(formData: FormData) {
  const parsed = runSchema.safeParse(Object.fromEntries(formData.entries()));
  if (parsed.success && blockedWords.some((word) => parsed.data.comment.includes(word))) {
    return { success: false as const, error: { flatten: () => ({ fieldErrors: { comment: ["投稿できない表現が含まれています"] } }) } };
  }
  return parsed;
}

function jstDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 9 * 60 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
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
  await db.insert(runs).values({ userId: user.id, ...runValues(parsed.data) });
  revalidatePath(`/spots/${parsed.data.spotSlug}`); revalidatePath("/me/logs");
  redirect(`/spots/${parsed.data.spotSlug}?posted=1#dokolog`);
}

export async function updateRun(_: RunFormState, formData: FormData): Promise<RunFormState> {
  const user = await requireUser("/me/logs");
  const parsed = values(formData);
  if (!parsed.success || !parsed.data.id) return { message: "入力内容を確認してください", errors: parsed.success ? { id: ["記録IDがありません"] } : parsed.error.flatten().fieldErrors };
  const db = getDb();
  const current = await db.select({ userId: runs.userId }).from(runs).where(eq(runs.id, parsed.data.id)).limit(1);
  if (!current[0]) return { message: "記録が見つかりません" };
  assertRunOwnership(current[0].userId, user.id);
  await db.update(runs).set(runValues(parsed.data)).where(and(eq(runs.id, parsed.data.id), eq(runs.userId, user.id)));
  revalidatePath(`/spots/${parsed.data.spotSlug}`); revalidatePath("/me/logs");
  if (parsed.data.returnTo === "spot") redirect(`/spots/${parsed.data.spotSlug}?posted=updated#dokolog`);
  redirect("/me/logs?success=updated");
}

export async function deleteRun(formData: FormData) {
  const user = await requireUser("/me/logs");
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;
  const db = getDb();
  const current = await db.select({ userId: runs.userId, spotId: runs.spotId }).from(runs).where(eq(runs.id, id)).limit(1);
  if (!current[0]) return;
  assertRunOwnership(current[0].userId, user.id);
  await db.delete(runs).where(and(eq(runs.id, id), eq(runs.userId, user.id)));
  revalidatePath("/me/logs");
  const spot = await db.select({ slug: spots.slug }).from(spots).where(eq(spots.id, current[0].spotId)).limit(1);
  if (spot[0]) revalidatePath(`/spots/${spot[0].slug}`);
}
