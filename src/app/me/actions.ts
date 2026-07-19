"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { favoriteSpots, spots, userAvatars, userPbs, users } from "@/db/schema";
import { jstYear } from "@/lib/jst";
import { PB_EVENTS, secondsFromParts, validatePbTime } from "@/lib/pb";
import { normalizeInstagram, normalizeStrava, normalizeXHandle } from "@/lib/social";
import { getUser, requireUser } from "@/lib/user";

export type ProfileState = { status?: "saved" | "error"; message?: string; errors?: Record<string, string[]> };
export type PbState = { status?: "saved" | "error"; message?: string; errors?: Record<string, string[]> };
export type AvatarState = { status?: "saved" | "error"; message?: string };

const profileSchema = z.object({
  name: z.string().trim().min(1, "表示名を入力してください").max(50, "表示名は50文字までです"),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,29}$/, "3〜30文字の半角英数字・ハイフンで入力してください"),
  bio: z.string().trim().max(300, "自己紹介は300文字までです"),
  instagram: z.string().trim().max(120).optional(),
  xHandle: z.string().trim().max(120).optional(),
  strava: z.string().trim().max(120).optional(),
  runningSinceYear: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().min(1950).max(jstYear()).nullable()),
  runningSinceMonth: z.preprocess((value) => value === "" ? null : Number(value), z.number().int().min(1).max(12).nullable()),
});

const allowedAvatarTypes = new Set(["image/webp", "image/jpeg", "image/png"]);
const maxAvatarBytes = 200 * 1024;

function normalizeOptional(value: string | undefined, normalize: (value: string) => string | null) {
  if (!value) return null;
  return normalize(value);
}

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser("/me");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const instagram = normalizeOptional(parsed.data.instagram, normalizeInstagram);
  const xHandle = normalizeOptional(parsed.data.xHandle, normalizeXHandle);
  const strava = normalizeOptional(parsed.data.strava, normalizeStrava);
  const errors: Record<string, string[]> = {};
  if (parsed.data.instagram && !instagram) errors.instagram = ["Instagramのユーザー名またはURLを確認してください"];
  if (parsed.data.xHandle && !xHandle) errors.xHandle = ["Xのユーザー名またはURLを確認してください"];
  if (parsed.data.strava && !strava) errors.strava = ["StravaのID・ユーザー名またはURLを確認してください"];
  if (Object.keys(errors).length) return { status: "error", message: "入力内容を確認してください", errors };
  const runningSinceMonth = parsed.data.runningSinceYear ? parsed.data.runningSinceMonth : null;
  try {
    await getDb().update(users).set({
      name: parsed.data.name,
      handle: parsed.data.handle,
      bio: parsed.data.bio || null,
      instagram,
      xHandle,
      strava,
      runningSinceYear: parsed.data.runningSinceYear,
      runningSinceMonth,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) return { status: "error", message: "このハンドルはすでに使われています" };
    return { status: "error", message: "保存できませんでした。時間をおいて再度お試しください" };
  }
  revalidatePath("/me");
  revalidatePath(`/u/${user.handle}`);
  if (parsed.data.handle !== user.handle) revalidatePath(`/u/${parsed.data.handle}`);
  return { status: "saved", message: "プロフィールを保存しました" };
}

export async function updateAvatar(formData: FormData): Promise<AvatarState> {
  const user = await getUser();
  if (!user) return { status: "error", message: "ログインしてください" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { status: "error", message: "画像が指定されていません" };
  if (!allowedAvatarTypes.has(file.type)) return { status: "error", message: "webp・jpeg・pngのみアップロードできます" };
  if (file.size > maxAvatarBytes) return { status: "error", message: "画像サイズが大きすぎます" };
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const db = getDb();
  await db.insert(userAvatars).values({ userId: user.id, data, contentType: file.type })
    .onConflictDoUpdate({ target: userAvatars.userId, set: { data, contentType: file.type, updatedAt: new Date() } });
  await db.update(users).set({ customAvatarAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath(`/u/${user.handle}`);
  return { status: "saved", message: "アバターを更新しました" };
}

export async function deleteAvatar(): Promise<AvatarState> {
  const user = await getUser();
  if (!user) return { status: "error", message: "ログインしてください" };
  const db = getDb();
  await db.delete(userAvatars).where(eq(userAvatars.userId, user.id));
  await db.update(users).set({ customAvatarAt: null }).where(eq(users.id, user.id));
  revalidatePath(`/u/${user.handle}`);
  return { status: "saved", message: "Googleの画像に戻しました" };
}

export async function updatePbs(_: PbState, formData: FormData): Promise<PbState> {
  const user = await requireUser("/me");
  const db = getDb();
  const errors: Record<string, string[]> = {};
  const updates: { event: string; timeS: number | null; competitionName: string | null }[] = [];
  for (const event of PB_EVENTS) {
    const hourValue = String(formData.get(`${event.key}-h`) ?? "");
    const minuteValue = String(formData.get(`${event.key}-m`) ?? "");
    const secondValue = String(formData.get(`${event.key}-s`) ?? "");
    const competitionName = String(formData.get(`${event.key}-competition`) ?? "").trim();
    const hasAny = [hourValue, minuteValue, secondValue].some((value) => value !== "");
    if (!hasAny) {
      if (competitionName) errors[event.key] = [`${event.label}のタイムを入力してください`];
      updates.push({ event: event.key, timeS: null, competitionName: null });
      continue;
    }
    if (competitionName.length > 80) {
      errors[event.key] = ["大会名は80文字までです"];
      continue;
    }
    const hours = hourValue === "" ? 0 : Number(hourValue);
    const minutes = minuteValue === "" ? 0 : Number(minuteValue);
    const seconds = secondValue === "" ? 0 : Number(secondValue);
    if (![hours, minutes, seconds].every(Number.isInteger) || hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      errors[event.key] = [`${event.label}の時・分・秒を確認してください`];
      continue;
    }
    const timeS = secondsFromParts(hours, minutes, seconds);
    const error = validatePbTime(event.key, timeS);
    if (error) errors[event.key] = [error];
    updates.push({ event: event.key, timeS, competitionName: competitionName || null });
  }
  if (Object.keys(errors).length) return { status: "error", message: "自己ベストを確認してください", errors };
  for (const update of updates) {
    if (update.timeS === null) {
      await db.delete(userPbs).where(and(eq(userPbs.userId, user.id), eq(userPbs.event, update.event)));
    } else {
      await db.insert(userPbs).values({ userId: user.id, event: update.event, timeS: update.timeS, competitionName: update.competitionName })
        .onConflictDoUpdate({ target: [userPbs.userId, userPbs.event], set: { timeS: update.timeS, competitionName: update.competitionName, updatedAt: new Date() } });
    }
  }
  revalidatePath("/me");
  revalidatePath(`/u/${user.handle}`);
  return { status: "saved", message: "自己ベストを保存しました" };
}

export async function toggleFavorite(spotId: string, on: boolean) {
  const user = await requireUser("/spots");
  const spot = await getDb().select({ id: spots.id, slug: spots.slug }).from(spots)
    .where(and(eq(spots.id, spotId), eq(spots.isPublished, true))).limit(1);
  if (!spot[0]) return { ok: false };
  if (on) {
    await getDb().insert(favoriteSpots).values({ userId: user.id, spotId }).onConflictDoNothing();
  } else {
    await getDb().delete(favoriteSpots).where(and(eq(favoriteSpots.userId, user.id), eq(favoriteSpots.spotId, spotId)));
  }
  revalidatePath("/me");
  revalidatePath("/me/favorites");
  revalidatePath(`/u/${user.handle}`);
  revalidatePath(`/spots/${spot[0].slug}`);
  return { ok: true, on };
}
