import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { raceStories } from "@/lib/race-stories";
import { RaceStoryArticle } from "@/components/race-story";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "記事プレビュー",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function StoryPreview({ params }: { params: Promise<{ slug: string }> }) {
  // 未取材の記事サンプルは開発環境だけで表示する。本番では管理者にも公開しない。
  if (process.env.NODE_ENV !== "development") notFound();
  const { slug } = await params;
  const story = raceStories.find((item) => item.slug === slug);
  if (!story) notFound();
  return <RaceStoryArticle story={story} preview />;
}
