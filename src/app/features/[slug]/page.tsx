import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeatureSpots } from "@/db/data";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { prefectureSlug } from "@/lib/areas";
import { prefectures } from "@/lib/prefectures";
import { features, featureBySlug } from "@/lib/features";

// 特集の対象はDBタグで増減するため、公開直後から最新の並び・件数を返す。
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getSpots = cache(getFeatureSpots);

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const feature = featureBySlug.get(slug);
  if (!feature) return { title: "ページが見つかりません" };
  const featureSpots = await getSpots(slug);
  const title = `${feature.title}【全国${featureSpots.length}件】`;
  const canonical = `${baseUrl()}/features/${slug}`;
  return { title, description: feature.description, alternates: { canonical }, openGraph: { title, description: feature.description, url: canonical } };
}

export default async function FeaturePage({ params }: { params: Params }) {
  const { slug } = await params;
  const feature = featureBySlug.get(slug);
  if (!feature) notFound();
  const featureSpots = await getSpots(slug);
  if (!featureSpots.length) notFound();
  // 朝ランは利用者の多い東京を先頭に、それ以外は北から南の都道府県順で表示する。
  const orderedPrefectures = feature.slug === "morning-run"
    ? ["東京都", ...prefectures.filter((prefecture) => prefecture !== "東京都")]
    : prefectures;
  // 都道府県でグループ化し、エリアページへの内部リンクも兼ねる
  const grouped = orderedPrefectures
    .map((prefecture) => ({ prefecture, spots: featureSpots.filter((spot) => spot.prefecture === prefecture) }))
    .filter((group) => group.spots.length > 0);
  const otherFeatures = features.filter((item) => item.slug !== feature.slug);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: baseUrl() },
        { "@type": "ListItem", position: 2, name: "条件からさがす", item: `${baseUrl()}/features` },
        { "@type": "ListItem", position: 3, name: feature.title, item: `${baseUrl()}/features/${slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: feature.title,
      numberOfItems: featureSpots.length,
      itemListElement: featureSpots.map((spot, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: spot.name,
        url: `${baseUrl()}/spots/${spot.slug}`,
      })),
    },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <TrackView name="feature_view" meta={{ feature: slug }} />
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub">
        <Link href="/" className="hover:underline">ホーム</Link> / <Link href="/features" className="hover:underline">条件からさがす</Link> / {feature.name}
      </nav>
      <h1 className="text-2xl font-bold sm:text-3xl">{feature.emoji} {feature.title}</h1>
      <p className="mt-3 leading-7 text-sub">{feature.lead} 全国<strong className="text-ink">{featureSpots.length}件</strong>を掲載中。</p>
      <div className="mt-8 space-y-10">
        {grouped.map((group) => (
          <section key={group.prefecture}>
            <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">
              <Link href={`/areas/${prefectureSlug(group.prefecture)}`} className="hover:text-accent">{group.prefecture}</Link>
            </h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {group.spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-14">
        <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">ほかの条件からさがす</h2>
        <div className="flex flex-wrap gap-2.5">
          {otherFeatures.map((item) => (
            <Link key={item.slug} href={`/features/${item.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">
              {item.emoji} {item.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
