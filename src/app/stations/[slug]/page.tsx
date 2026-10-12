import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpotCard } from "@/components/spot-card";
import { getSpotSummariesBySlugs } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { groupByMap } from "@/lib/collections";
import { pageMetadata } from "@/lib/site";
import { getStation, getStations, stationJogMinutes } from "@/lib/stations";
import { Breadcrumb } from "@/components/breadcrumb";
import { breadcrumbJsonLd, JsonLd } from "@/components/structured-data";
import { SectionHeading } from "@/components/section-heading";

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStations().map(({ slug }) => ({ slug }));
}

const getPageData = cache(async (slug: string) => {
  const station = getStation(slug);
  if (!station) return null;
  const spotSlugs = [...station.nearbySpots.map((spot) => spot.slug), ...station.oneStationSpots.map((spot) => spot.slug)];
  const spots = await getSpotSummariesBySlugs(spotSlugs);
  return { station, spots: new Map(spots.map((spot) => [spot.slug, spot])) };
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return { title: "駅が見つかりません" };
  const representativeSlug = data.station.nearbySpots[0]?.slug ?? data.station.oneStationSpots[0]?.slug;
  const representative = data.spots.get(representativeSlug)?.name;
  const title = `${data.station.name}駅から走れるランニングスポット`;
  const description = `${data.station.name}駅チカのランニングスポットは${data.station.nearbySpots.length}件。${representative ? `${representative}など、` : ""}同じ路線で3駅以内のひと駅ラン候補も探せます。`;
  return pageMetadata({ title, description, path: `/stations/${slug}` });
}

export default async function StationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) notFound();
  const { station, spots } = data;
  const oneStationGroups = groupByMap(station.oneStationSpots, (spot) => `${spot.stationCount}:${spot.lineName}:${spot.destinationStationName}`);
  const adjacentGroups = groupByMap(station.adjacentStations, (item) => item.lineName);
  const crumbs = [
    { name: "ホーム", path: "/" },
    { name: station.prefecture, path: `/areas/${prefectureSlug(station.prefecture)}` },
    { name: `${station.name}駅`, path: `/stations/${station.slug}` },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 md:px-6">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <header>
        <Breadcrumb items={crumbs.map((crumb) => ({ name: crumb.name, href: crumb.path }))} />
        <p className="text-sm font-bold text-sub">{station.prefecture}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">{station.name}駅から走れるランニングスポット</h1>
        <div className="mt-5 flex flex-wrap gap-2">{station.lines.map((line) => <Link key={line.slug} href={`/stations/lines/${line.slug}`} className="rounded-full bg-cream px-3 py-1.5 text-sm font-bold hover:bg-brand/20">{line.name}</Link>)}</div>
        <p className="mt-5 rounded-lg bg-cream px-4 py-3 text-sm text-sub">ジョグはキロ6分で計算しています。</p>
      </header>

      {station.nearbySpots.length > 0 && <section>
        <SectionHeading className="mb-2">駅チカのランニングスポット</SectionHeading>
        <p className="mb-6 pl-4 text-sm leading-6 text-sub">{station.name}駅から2km以内。徒歩の近い順に掲載しています。</p>
        <div className="grid gap-6 lg:grid-cols-2">{station.nearbySpots.map((nearby) => {
          const spot = spots.get(nearby.slug);
          return spot ? <div key={nearby.slug} className="space-y-2"><p className="text-sm font-bold text-accent">駅から徒歩{nearby.walkMinutes}分 <span className="ml-2 text-sub">ジョグ{stationJogMinutes(nearby.distanceM)}分</span></p><SpotCard spot={spot} /></div> : null;
        })}</div>
      </section>}

      {station.oneStationSpots.length > 0 && <section>
        <SectionHeading className="mb-2">ひと駅ラン</SectionHeading>
        <p className="mb-7 pl-4 text-sm leading-6 text-sub">同じ路線で3駅以内。少し足を伸ばしてから走る候補です。</p>
        <div className="space-y-9">{[...oneStationGroups].map(([key, items]) => {
          const first = items[0];
          return <div key={key}>
            <h3 className="mb-4 text-lg font-bold">{first.lineName}で{first.stationCount}駅・{first.destinationStationName}駅下車</h3>
            <div className="grid gap-6 lg:grid-cols-2">{items.map((item) => {
              const spot = spots.get(item.slug);
              return spot ? <div key={item.slug} className="space-y-2"><p className="text-sm font-bold text-sub">{first.destinationStationName}駅から徒歩{item.walkMinutes}分 <span className="ml-2">ジョグ{stationJogMinutes(item.distanceM)}分</span></p><SpotCard spot={spot} /></div> : null;
            })}</div>
          </div>;
        })}</div>
      </section>}

      {station.adjacentStations.length > 0 && <section className="rounded-2xl bg-cream px-5 py-6 sm:px-7">
        <h2 className="text-xl font-bold">となりの駅から探す</h2>
        <div className="mt-4 space-y-3">{[...adjacentGroups].map(([lineName, items]) => <p key={lineName} className="text-sm leading-7"><span className="font-bold">{lineName}でとなりの駅:</span>{" "}{items.map((item, index) => <span key={item.slug}>{index > 0 && "・"}<Link href={`/stations/${item.slug}`} className="text-accent hover:underline">{item.name}駅</Link></span>)}</p>)}</div>
      </section>}
    </div>
  );
}
