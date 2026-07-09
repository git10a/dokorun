import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpotsByPrefecture } from "@/db/data";
import { SpotCard } from "@/components/spot-card";
import { TrackView } from "@/components/track-view";
import { prefectureSlug, slugToPrefecture } from "@/lib/areas";
import { regionGroups } from "@/lib/prefectures";
import { features } from "@/lib/features";

// スポットの追加・更新の反映が最大1時間遅れるのみ。検索エンジン向けの静的な面なのでISR化
export const revalidate = 3600;

type Params = Promise<{ pref: string }>;

// generateMetadataと本体で同一リクエスト内のフェッチを共有する
const getAreaSpots = cache(getSpotsByPrefecture);

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pref } = await params;
  const prefecture = slugToPrefecture(pref);
  if (!prefecture) return { title: "エリアが見つかりません" };
  const areaSpots = await getAreaSpots(prefecture);
  if (!areaSpots.length) return { title: "エリアが見つかりません" };
  const names = areaSpots.slice(0, 3).map((spot) => spot.name).join("、");
  const title = `${prefecture}のランニングコース・スポット一覧【${areaSpots.length}件】`;
  const description = `${prefecture}のランニングコースを${areaSpots.length}件掲載。${names}など、コースマップ・距離・信号の数・トイレなどの設備情報つきで走る場所を探せます。`;
  return { title, description, alternates: { canonical: `${baseUrl()}/areas/${pref}` }, openGraph: { title, description } };
}

export default async function AreaPage({ params }: { params: Params }) {
  const { pref } = await params;
  const prefecture = slugToPrefecture(pref);
  if (!prefecture) notFound();
  const areaSpots = await getAreaSpots(prefecture);
  if (!areaSpots.length) notFound();
  const region = regionGroups.find((group) => (group.prefectures as readonly string[]).includes(prefecture));
  const neighborPrefectures = region?.prefectures.filter((name) => name !== prefecture) ?? [];
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: baseUrl() },
        { "@type": "ListItem", position: 2, name: "エリアからさがす", item: `${baseUrl()}/areas` },
        { "@type": "ListItem", position: 3, name: prefecture, item: `${baseUrl()}/areas/${pref}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${prefecture}のランニングコース・スポット一覧`,
      numberOfItems: areaSpots.length,
      itemListElement: areaSpots.map((spot, index) => ({
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
      <TrackView name="area_view" meta={{ pref: prefecture }} />
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub">
        <Link href="/" className="hover:underline">ホーム</Link> / <Link href="/areas" className="hover:underline">エリアからさがす</Link> / {prefecture}
      </nav>
      <h1 className="text-2xl font-bold sm:text-3xl">{prefecture}のランニングコース・スポット一覧</h1>
      <p className="mt-3 leading-7 text-sub">
        {prefecture}のランニングスポットを<strong className="text-ink">{areaSpots.length}件</strong>掲載しています。すべてのスポットにコースマップと距離・高低差・信号の数、トイレや水飲み場などの設備情報つき。
      </p>
      <div className="mt-4">
        <Link href={`/spots?pref=${encodeURIComponent(prefecture)}`} className="inline-block rounded-lg border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">距離やタグで絞り込む →</Link>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {areaSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
      </div>
      <section className="mt-14">
        <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">条件からさがす</h2>
        <div className="flex flex-wrap gap-2.5">
          {features.map((feature) => (
            <Link key={feature.slug} href={`/features/${feature.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">
              {feature.emoji} {feature.name}
            </Link>
          ))}
        </div>
      </section>
      {neighborPrefectures.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">近くのエリア</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {neighborPrefectures.map((name) => (
              <Link key={name} href={`/areas/${prefectureSlug(name)}`} className="text-accent hover:underline">{name}のランニングコース</Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
