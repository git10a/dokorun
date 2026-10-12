import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedStory } from "@/lib/race-stories";
import { RaceStoryArticle } from "@/components/race-story";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = getPublishedStory((await params).slug);
  if (!story) notFound();
  const title = story.title.replaceAll("\n", "");
  return { title, description: story.description, alternates: { canonical: `/stories/${story.slug}` },
    openGraph: { title, description: story.description, type: "article", url: `/stories/${story.slug}`, publishedTime: story.publishedAt } };
}

export default async function StoryPage({ params }: Props) {
  const story = getPublishedStory((await params).slug);
  if (!story) notFound();
  return <RaceStoryArticle story={story} />;
}
