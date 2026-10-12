"use server";

import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, runAtomically } from "@/db";
import { courses, events, spots } from "@/db/schema";
import { jstDayBounds } from "@/lib/jst";
import { revalidateSpotCatalog } from "@/lib/revalidate";
import { courseTypes, facilitiesFromForm, lightings, surfaces } from "@/lib/types";
import { requireUser } from "@/lib/user";

export type SpotEditState = { message?: string; errors?: Record<string, string[]> };

const blockedWords = ["死ね", "殺す", "消えろ", "ばか"];

const spotEditSchema = z.object({
  spotId: z.string().uuid(),
  spotSlug: z.string().min(1).max(120),
  name: z.string().trim().min(1, "名前を入力してください").max(80, "名前は80文字までです"),
  nameKana: z.string().trim().min(1, "かなを入力してください").max(120, "かなは120文字までです"),
  description: z.string().trim().min(1, "紹介文を入力してください").max(2000, "紹介文は2000文字までです"),
  access: z.string().trim().max(1000, "アクセスは1000文字までです"),
  courseType: z.enum(courseTypes),
  surface: z.enum(surfaces),
  signalsCount: z.string().trim().regex(/^\d{0,3}$/, "信号数は0〜999の数字で入力してください"),
  nightLighting: z.enum(["", ...lightings]),
});

export async function updateSpotInfo(_: SpotEditState, formData: FormData): Promise<SpotEditState> {
  const spotSlug = String(formData.get("spotSlug") ?? "");
  const user = await requireUser(`/spots/${spotSlug}/edit`);
  const parsed = spotEditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if ([data.name, data.nameKana, data.description, data.access].some((text) => blockedWords.some((word) => text.includes(word)))) {
    return { message: "投稿できない表現が含まれています" };
  }
  const facilities = facilitiesFromForm(formData);
  const db = getDb();
  const { start, end } = jstDayBounds();
  const daily = await db.select({ count: count() }).from(events)
    .where(and(eq(events.name, "spot_edit"), gte(events.createdAt, start), lt(events.createdAt, end), sql`json_extract(${events.meta}, '$.userId') = ${user.id}`));
  if ((daily[0]?.count ?? 0) >= 10) return { message: "1日に修正できるのは10回までです。また明日お願いします" };
  const current = (await db.select().from(spots)
    .where(and(eq(spots.id, data.spotId), eq(spots.slug, data.spotSlug), eq(spots.isPublished, true))).limit(1))[0];
  if (!current) return { message: "スポットが見つかりません" };
  const currentCourse = (await db.select({ courseType: courses.courseType, surface: courses.surface, signalsCount: courses.signalsCount })
    .from(courses).where(and(eq(courses.spotId, current.id), eq(courses.isPrimary, true))).limit(1))[0];
  const nextSpot = {
    name: data.name,
    nameKana: data.nameKana,
    description: data.description,
    access: data.access || null,
    ...facilities,
    nightLighting: data.nightLighting === "" ? null : data.nightLighting,
  };
  const nextCourse = {
    courseType: data.courseType,
    surface: data.surface,
    signalsCount: data.signalsCount === "" ? null : Number(data.signalsCount),
  };
  // 監査用に変更のあった項目だけ before/after を events に残す
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const [key, after] of Object.entries(nextSpot)) {
    const before = current[key as keyof typeof current];
    if (before !== after) changes[key] = { before, after };
  }
  if (currentCourse) {
    for (const [key, after] of Object.entries(nextCourse)) {
      const before = currentCourse[key as keyof typeof currentCourse];
      if (before !== after) changes[key] = { before, after };
    }
  }
  if (!Object.keys(changes).length) redirect(`/spots/${data.spotSlug}?posted=info`);
  // スポット・コースの更新と監査ログを1バッチにして、記録の欠けた変更が残らないようにする
  await runAtomically([
    db.update(spots).set({ ...nextSpot, updatedAt: new Date() }).where(eq(spots.id, current.id)),
    ...(currentCourse ? [db.update(courses).set(nextCourse).where(and(eq(courses.spotId, current.id), eq(courses.isPrimary, true)))] : []),
    db.insert(events).values({ name: "spot_edit", path: `/spots/${data.spotSlug}`, meta: { userId: user.id, spotId: current.id, changes } }),
  ]);
  revalidateSpotCatalog(data.spotSlug);
  redirect(`/spots/${data.spotSlug}?posted=info`);
}
