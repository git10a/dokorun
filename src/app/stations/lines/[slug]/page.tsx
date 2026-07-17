import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpotCard } from "@/components/spot-card";
import { getSpotSummariesBySlugs } from "@/db/data";
import { getStationLine, getStationLines, stationJogMinutes } from "@/lib/stations";

export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return getStationLines().map(({ slug }) => ({ slug }));
}

const getPageData = cache(async (slug: string) => {
  const line = getStationLine(slug);
  if (!line) return null;
  const spotSlugs = line.stations.flatMap((station) => station.nearbySpots.map((spot) => spot.slug));
  const spots = await getSpotSummariesBySlugs(spotSlugs);
  return { line, spots: new Map(spots.map((spot) => [spot.slug, spot])) };
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) return { title: "路線が見つかりません" };
  const first = data.line.stations[0]?.name;
  const last = data.line.stations.at(-1)?.name;
  const title = `${data.line.name}の駅別ランニングスポット`;
  const description = `${data.line.name}の${first}駅から${last}駅まで全${data.line.stations.length}駅を掲載。各駅の近くで走れるランニングスポットを探せます。`;
  return { title, description, alternates: { canonical: `/stations/lines/${slug}` }, openGraph: { title, description, url: `/stations/lines/${slug}` } };
}

export default async function StationLinePage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  if (!data) notFound();
  const { line, spots } = data;
  const firstStation = line.stations[0];
  const lastStation = line.stations.at(-1);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / <Link href="/stations" className="hover:underline">駅から探す</Link> / <Link href="/stations/lines" className="hover:underline">路線から探す</Link> / {line.name}</nav>
      <header>
        <p className="text-sm font-bold text-sub">{line.prefectures.join("・")}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">{line.name}の駅別ランニングスポット</h1>
        <p className="mt-4 leading-7 text-sub">{line.isLoop ? `${firstStation?.name}駅から一周` : `${firstStation?.name}駅から${lastStation?.name}駅まで`}、全{line.stations.length}駅を順番に掲載しています。</p>
        <p className="mt-5 rounded-lg bg-cream px-4 py-3 text-sm text-sub">ジョグはキロ6分で計算しています。</p>
      </header>

      <ol className="mt-12 space-y-0">{line.stations.map((station, index) => {
        const isFirst = index === 0;
        const isLast = index === line.stations.length - 1;
        return <li key={`${station.name}-${index}`} className="relative border-l-2 border-brand pb-10 pl-7 last:border-transparent last:pb-0">
          <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-paper bg-brand" />
          <div className="flex flex-wrap items-center gap-2">
            {station.pageSlug ? <Link href={`/stations/${station.pageSlug}`} className="text-xl font-bold hover:text-accent hover:underline">{station.name}駅</Link> : <h2 className="text-xl font-bold">{station.name}駅</h2>}
            {isFirst && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold">{line.isLoop ? "起点" : "始点"}</span>}
            {isLast && !line.isLoop && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold">終点</span>}
          </div>
          <p className="mt-1 text-xs text-sub">{station.prefecture}</p>
          {station.nearbySpots.length > 0 ? <div className="mt-4 grid gap-5 lg:grid-cols-2">{station.nearbySpots.map((nearby) => {
            const spot = spots.get(nearby.slug);
            return spot ? <div key={nearby.slug} className="space-y-2"><p className="text-sm font-bold text-accent">駅から徒歩{nearby.walkMinutes}分 <span className="ml-2 text-sub">ジョグ{stationJogMinutes(nearby.distanceM)}分</span></p><SpotCard spot={spot} /></div> : null;
          })}</div> : <div className="mt-4 rounded-xl bg-cream px-4 py-4 text-sm text-sub">この駅の近くのランニングスポットは、まだありません。</div>}
        </li>;
      })}</ol>
    </div>
  );
}
