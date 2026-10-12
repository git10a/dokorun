import { cache } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeatureSpots } from "@/db/data";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { prefectureSlug } from "@/lib/areas";
import { prefectures } from "@/lib/prefectures";
import { features, featureBySlug } from "@/lib/features";
import { Breadcrumb } from "@/components/breadcrumb";
import { breadcrumbJsonLd, JsonLd, spotItemListJsonLd } from "@/components/structured-data";
import { SectionHeading } from "@/components/section-heading";

// 特集の対象は最大1時間の遅延を許容し、D1障害時も直前のHTMLを返せるようISR化する。
export const revalidate = 86400;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return features.map((feature) => ({ slug: feature.slug }));
}

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getSpots = cache(getFeatureSpots);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const feature = featureBySlug.get(slug);
  if (!feature) return { title: "ページが見つかりません" };
  const featureSpots = await getSpots(slug);
  const title = `${feature.title}【全国${featureSpots.length}件】`;
  return pageMetadata({ title, description: feature.description, path: `/features/${slug}` });
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
    breadcrumbJsonLd([{ name: "ホーム", path: "/" }, { name: "条件からさがす", path: "/features" }, { name: feature.title, path: `/features/${slug}` }]),
    spotItemListJsonLd(feature.title, featureSpots),
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <JsonLd data={structuredData} />
      <TrackView name="feature_view" meta={{ feature: slug }} />
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "条件からさがす", href: "/features" }, { name: feature.name }]} />
      <h1 className="text-2xl font-bold sm:text-3xl">{feature.emoji} {feature.title}</h1>
      <p className="mt-3 leading-7 text-sub">{feature.lead} 全国<strong className="text-ink">{featureSpots.length}件</strong>を掲載中。</p>
      <div className="mt-8 space-y-10">
        {grouped.map((group) => (
          <section key={group.prefecture}>
            <SectionHeading className="mb-4">
              <Link href={`/areas/${prefectureSlug(group.prefecture)}`} className="hover:text-accent">{group.prefecture}</Link>
            </SectionHeading>
            <div className="grid gap-5 lg:grid-cols-2">
              {group.spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-14">
        <SectionHeading className="mb-4">ほかの条件からさがす</SectionHeading>
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
