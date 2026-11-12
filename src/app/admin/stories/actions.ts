"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isUniqueViolation } from "@/db";
import { articles, articleStatuses } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { raceBySlug } from "@/lib/races";
import type { FormState } from "../actions";

const optionalText = z.preprocess((value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}, z.string().nullable());

const optionalImageUrl = optionalText.refine(
  (value) => value === null || /^https:\/\//.test(value),
  "画像はアップロードして設定してください",
);

const articleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "タイトルを入力してください").max(120, "タイトルは120文字以内にしてください"),
  subtitle: optionalText,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "URLは半角英小文字・数字とハイフンで入力してください"),
  raceSlug: optionalText.refine((value) => value === null || raceBySlug.has(value), "大会を選び直してください"),
  body: z.string().trim().min(1, "本文を入力してください").max(100_000, "本文が長すぎます"),
  speakers: optionalText,
  author: z.string().trim().min(1, "執筆者を入力してください"),
  coverImageUrl: optionalImageUrl,
  seoTitle: optionalText,
  description: z
    .string()
    .trim()
    .min(1, "検索結果に出す説明文を入力してください")
    .max(300, "説明文は300文字以内にしてください"),
  ogTitle: optionalText,
  ogDescription: optionalText,
  ogImageUrl: optionalImageUrl,
  status: z.enum(articleStatuses),
  publishedOn: optionalText.refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "公開日を選び直してください",
  ),
});

const newPreviewToken = () => crypto.randomUUID().replaceAll("-", "");

// 記事ページと、記事カードを載せている大会ページを更新する。
// サイトマップは静的生成のままにし、次の配信で反映する(sitemap.ts の方針)
function revalidateArticle(slug: string, raceSlug: string | null) {
  revalidatePath(`/stories/${slug}`);
  if (raceSlug) revalidatePath(`/races/${raceSlug}`);
}

export async function saveArticle(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = articleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { message: "入力内容を確認してください", errors: parsed.error.flatten().fieldErrors };
  const { id, publishedOn, ...fields } = parsed.data;
  const db = getDb();
  const existing = id ? (await db.select().from(articles).where(eq(articles.id, id)).limit(1))[0] : undefined;
  if (id && !existing) return { message: "記事が見つかりません。一覧から開き直してください" };

  // 公開日: 指定があればその日(日本時間の0時)。無ければ初めて公開した時刻を入れ、以後は変えない
  const publishedAt = publishedOn
    ? new Date(`${publishedOn}T00:00:00+09:00`)
    : (existing?.publishedAt ?? (fields.status === "published" ? new Date() : null));
  const articleId = existing?.id ?? crypto.randomUUID();
  try {
    if (existing) {
      await db
        .update(articles)
        .set({ ...fields, publishedAt, updatedAt: new Date() })
        .where(eq(articles.id, articleId));
    } else {
      await db.insert(articles).values({ id: articleId, ...fields, publishedAt, previewToken: newPreviewToken() });
    }
  } catch (error) {
    if (isUniqueViolation(error))
      return { message: "入力内容を確認してください", errors: { slug: ["このURLは別の記事で使われています"] } };
    return { message: "保存できませんでした" };
  }
  // URLや大会を変えた場合に備えて、変更前のページも更新する
  if (existing) revalidateArticle(existing.slug, existing.raceSlug);
  revalidateArticle(fields.slug, fields.raceSlug);
  const result = fields.status === "published" ? (existing?.status === "published" ? "updated" : "published") : "saved";
  redirect(`/admin/stories/${articleId}/edit?success=${result}`);
}

/** 共有プレビューのURLを作り直す。これまでのURLは開けなくなる */
export async function regeneratePreviewToken(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) redirect("/admin/stories");
  await getDb().update(articles).set({ previewToken: newPreviewToken() }).where(eq(articles.id, id));
  redirect(`/admin/stories/${id}/edit?success=token`);
}

export async function deleteArticle(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (z.string().uuid().safeParse(id).success) {
    const db = getDb();
    const existing = (await db.select().from(articles).where(eq(articles.id, id)).limit(1))[0];
    if (existing) {
      await db.delete(articles).where(eq(articles.id, id));
      revalidateArticle(existing.slug, existing.raceSlug);
    }
  }
  redirect("/admin/stories?success=deleted");
}
