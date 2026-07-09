"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, withTxDb, type Database } from "@/db";
import { communities, spotCommunities, spots } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { normalizeInstagram, normalizeStravaClub, normalizeXHandle } from "@/lib/social";
import type { FormState } from "../actions";

const optionalText = z.preprocess((value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}, z.string().nullable());

// SNSはSocialLinksでURLに組み立てるため、handle形式に正規化して保存する
const optionalSocial = (normalize: (value: string) => string | null, message: string) =>
  optionalText.transform((value, ctx) => {
    if (value === null) return null;
    const handle = normalize(value);
    if (!handle) ctx.addIssue({ code: "custom", message });
    return handle;
  });

const communitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "名前を入力してください"),
  description: z.string().trim().min(1, "紹介文を入力してください"),
  schedule: optionalText,
  instagram: optionalSocial(normalizeInstagram, "Instagramのユーザー名またはURLを入力してください"),
  xHandle: optionalSocial(normalizeXHandle, "Xのユーザー名またはURLを入力してください"),
  strava: optionalSocial(normalizeStravaClub, "StravaクラブのslugまたはURLを入力してください"),
  website: optionalText.refine((value) => value === null || /^https?:\/\//.test(value), "WebサイトはURL(https://〜)で入力してください"),
});

type Tx = Database;

async function requireAdmin() {
  if (!await isAdmin()) throw new Error("認証が必要です");
}

async function writeSpotLinks(tx: Tx, communityId: string, formData: FormData) {
  const spotIds = formData.getAll("spotIds").map(String).filter(Boolean);
  if (!spotIds.length) return;
  const existing = await tx.select({ id: spots.id }).from(spots).where(inArray(spots.id, spotIds));
  if (existing.length) await tx.insert(spotCommunities).values(existing.map((spot) => ({ spotId: spot.id, communityId })));
}

async function revalidateLinkedSpots(communityId: string) {
  const rows = await getDb().select({ slug: spots.slug }).from(spotCommunities)
    .innerJoin(spots, eq(spots.id, spotCommunities.spotId))
    .where(eq(spotCommunities.communityId, communityId));
  for (const row of rows) revalidatePath(`/spots/${row.slug}`);
}

export async function createCommunity(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = communitySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  let communityId = "";
  try {
    // D1は対話的トランザクション非対応のため逐次実行(admin限定の低頻度操作)
    await withTxDb(async (tx) => {
      const [community] = await tx.insert(communities).values({
        name: data.name, description: data.description, schedule: data.schedule,
        instagram: data.instagram, xHandle: data.xHandle, strava: data.strava, website: data.website,
        isPublished: formData.get("isPublished") === "on",
      }).returning({ id: communities.id });
      communityId = community.id;
      await writeSpotLinks(tx, community.id, formData);
    });
  } catch { return { message: "保存できませんでした" }; }
  await revalidateLinkedSpots(communityId);
  redirect("/admin/communities?success=created");
}

export async function updateCommunity(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = communitySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success || !parsed.data.id) return { message: "入力内容を確認してください", errors: parsed.success ? { id: ["コミュニティIDがありません"] } : parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const communityId = data.id!;
  // 紐付け解除されたスポットのページも更新するため、変更前のリンクを先に再検証対象へ含める
  await revalidateLinkedSpots(communityId);
  try {
    await withTxDb(async (tx) => {
      await tx.update(communities).set({
        name: data.name, description: data.description, schedule: data.schedule,
        instagram: data.instagram, xHandle: data.xHandle, strava: data.strava, website: data.website,
        isPublished: formData.get("isPublished") === "on", updatedAt: new Date(),
      }).where(eq(communities.id, communityId));
      await tx.delete(spotCommunities).where(eq(spotCommunities.communityId, communityId));
      await writeSpotLinks(tx, communityId, formData);
    });
  } catch { return { message: "更新できませんでした" }; }
  await revalidateLinkedSpots(communityId);
  redirect("/admin/communities?success=updated");
}

export async function deleteCommunity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (z.string().uuid().safeParse(id).success) {
    await revalidateLinkedSpots(id);
    await getDb().delete(communities).where(eq(communities.id, id));
  }
  redirect("/admin/communities?success=deleted");
}
