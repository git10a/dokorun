import { cache } from "react";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { articles } from "@/db/schema";

export type Article = typeof articles.$inferSelect;
export type ArticleSummary = Pick<
  Article,
  "slug" | "raceSlug" | "title" | "subtitle" | "description" | "author" | "coverImageUrl" | "publishedAt" | "updatedAt"
>;

// 公開の条件は「公開状態」かつ「公開日あり」。下書きは共有プレビュー(トークン)からしか見えない
const isPublished = and(eq(articles.status, "published"), isNotNull(articles.publishedAt));

const summaryColumns = {
  slug: articles.slug,
  raceSlug: articles.raceSlug,
  title: articles.title,
  subtitle: articles.subtitle,
  description: articles.description,
  author: articles.author,
  coverImageUrl: articles.coverImageUrl,
  publishedAt: articles.publishedAt,
  updatedAt: articles.updatedAt,
};

// generateMetadata と本体で同一リクエスト内のフェッチを共有する。
// 失敗は握りつぶさない(一時的なD1障害で404を静的キャッシュに残さないため)
export const getPublishedArticle = cache(async (slug: string): Promise<Article | null> => {
  const rows = await getDb()
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), isPublished))
    .limit(1);
  return rows[0] ?? null;
});

// 大会ページ・サイトマップ・静的パラメータ用。記事が取れなくても既存ページは落とさない
// (articles テーブルを本番へ適用する前のビルドもここで空になる)
export async function getPublishedArticles(raceSlug?: string): Promise<ArticleSummary[]> {
  try {
    return await getDb()
      .select(summaryColumns)
      .from(articles)
      .where(raceSlug ? and(eq(articles.raceSlug, raceSlug), isPublished) : isPublished)
      .orderBy(desc(articles.publishedAt));
  } catch (error) {
    console.error("Articles unavailable", error instanceof Error ? error.message : "unknown error");
    return [];
  }
}

export const previewTokenPattern = /^[0-9a-f]{32}$/;

/** 共有プレビュー用。公開状態に関係なく、トークンが一致する記事を返す */
export async function getArticleByPreviewToken(token: string): Promise<Article | null> {
  if (!previewTokenPattern.test(token)) return null;
  const rows = await getDb().select().from(articles).where(eq(articles.previewToken, token)).limit(1);
  return rows[0] ?? null;
}

// 管理画面(/admin/stories)用。公開状態に関係なく全件を見る
export async function getAdminArticles() {
  return getDb()
    .select({
      id: articles.id,
      slug: articles.slug,
      raceSlug: articles.raceSlug,
      title: articles.title,
      status: articles.status,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .orderBy(desc(articles.updatedAt));
}

export async function getAdminArticle(id: string): Promise<Article | null> {
  const rows = await getDb().select().from(articles).where(eq(articles.id, id)).limit(1);
  return rows[0] ?? null;
}
