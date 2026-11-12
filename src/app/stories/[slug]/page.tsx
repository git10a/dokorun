import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedArticle, getPublishedArticles } from "@/db/articles";
import { ArticleView } from "@/components/article-view";
import { breadcrumbJsonLd, JsonLd } from "@/components/structured-data";
import { raceBySlug } from "@/lib/races";
import { getSiteUrl, openGraph, siteConfig } from "@/lib/site";

// 時間ベースの再生成はしない(理由は spots/[slug]/page.tsx)。
// 管理画面(/admin/stories)での保存・公開は revalidatePath で反映する
export const revalidate = false;

type Props = { params: Promise<{ slug: string }> };

// 公開済みの記事は配信時に静的生成し、配信後に公開した記事は初回アクセスで生成する
export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublishedArticle((await params).slug);
  if (!article) notFound();
  const title = article.seoTitle ?? article.title;
  const canonical = `${getSiteUrl()}/stories/${article.slug}`;
  const ogTitle = article.ogTitle ?? title;
  const ogDescription = article.ogDescription ?? article.description;
  const image = article.ogImageUrl ?? article.coverImageUrl;
  return {
    title,
    description: article.description,
    alternates: { canonical },
    openGraph: openGraph({
      type: "article",
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      ...(image ? { images: [{ url: image, alt: ogTitle }] } : {}),
    }),
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function StoryPage({ params }: Props) {
  const article = await getPublishedArticle((await params).slug);
  if (!article) notFound();
  const race = article.raceSlug ? raceBySlug.get(article.raceSlug) : undefined;
  const url = `${getSiteUrl()}/stories/${article.slug}`;
  const image = article.ogImageUrl ?? article.coverImageUrl;
  const structuredData = [
    breadcrumbJsonLd([
      { name: "ホーム", path: "/" },
      { name: "大会からさがす", path: "/races" },
      ...(race ? [{ name: race.name, path: `/races/${race.slug}` }] : []),
      { name: article.title, path: `/stories/${article.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      ...(image ? { image: [image] } : {}),
      datePublished: article.publishedAt?.toISOString(),
      dateModified: article.updatedAt.toISOString(),
      author: { "@type": "Organization", name: article.author, url: getSiteUrl() },
      publisher: { "@type": "Organization", name: siteConfig.name, url: getSiteUrl() },
      mainEntityOfPage: url,
    },
  ];
  return (
    <>
      <JsonLd data={structuredData} />
      <ArticleView article={article} />
    </>
  );
}
