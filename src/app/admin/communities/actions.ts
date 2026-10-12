"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb, runAtomically } from "@/db";
import { communities, spotCommunities, spots } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
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
  logoUrl: optionalText.refine((value) => value === null || /^https?:\/\//.test(value), "ロゴは画像をアップロードして設定してください"),
});

// スポットとの紐付けの insert 文を組み立てる(実行は呼び出し側の batch でまとめて行う)
async function spotLinkStatements(communityId: string, formData: FormData): Promise<BatchItem<"sqlite">[]> {
  const spotIds = formData.getAll("spotIds").map(String).filter(Boolean);
  if (!spotIds.length) return [];
  const db = getDb();
  const existing = await db.select({ id: spots.id }).from(spots).where(inArray(spots.id, spotIds));
  return existing.length ? [db.insert(spotCommunities).values(existing.map((spot) => ({ spotId: spot.id, communityId })))] : [];
}

function communityFields(data: z.infer<typeof communitySchema>, formData: FormData) {
  return {
    name: data.name, description: data.description, schedule: data.schedule,
    instagram: data.instagram, xHandle: data.xHandle, strava: data.strava, website: data.website,
    logoUrl: data.logoUrl,
    isPublished: formData.get("isPublished") === "on",
  };
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
  const communityId = crypto.randomUUID();
  try {
    await runAtomically([
      getDb().insert(communities).values({ id: communityId, ...communityFields(data, formData) }),
      ...await spotLinkStatements(communityId, formData),
    ]);
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
    const db = getDb();
    await runAtomically([
      db.update(communities).set({ ...communityFields(data, formData), updatedAt: new Date() }).where(eq(communities.id, communityId)),
      db.delete(spotCommunities).where(eq(spotCommunities.communityId, communityId)),
      ...await spotLinkStatements(communityId, formData),
    ]);
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
