import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleByPreviewToken } from "@/db/articles";
import { raceStories } from "@/lib/race-stories";
import { RaceStoryArticle } from "@/components/race-story";
import { ArticleView } from "@/components/article-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "記事プレビュー",
  robots: { index: false, follow: false, noarchive: true },
};

// [slug] には2種類の値が来る:
// - コード内の取材前サンプルのslug … 開発環境だけで表示する。本番では管理者にも公開しない
// - 記事の共有プレビュー用トークン … 管理画面で発行したURLを知っている人だけが、公開前の記事を見られる
export default async function StoryPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sample = raceStories.find((item) => item.slug === slug);
  if (sample) {
    if (process.env.NODE_ENV !== "development") notFound();
    return <RaceStoryArticle story={sample} preview />;
  }
  const article = await getArticleByPreviewToken(slug);
  if (!article) notFound();
  return <ArticleView article={article} preview />;
}
