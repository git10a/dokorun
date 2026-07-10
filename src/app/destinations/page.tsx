import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { DestinationResultCard } from "@/components/destination-result-card";
import { DestinationSearchFilters } from "@/components/destination-search-filters";
import { getSpotSummariesBySlugs } from "@/db/data";
import { getNearbyDestinationsForPurpose, getPrimaryNearbyDestinationRating, nearbyDestinationPurposeFilters } from "@/lib/nearby-destinations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "走る理由からさがす",
  description: "パン、カフェ、サウナなど行きたい場所の近くで走れるランニングコースを探せます。",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DestinationsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as Record<string, string | undefined>;
  const destinations = getNearbyDestinationsForPurpose(params.purpose);
  const spotRows = await getSpotSummariesBySlugs(destinations.map((destination) => destination.spotSlug));
  const spotsBySlug = new Map(spotRows.map((spot) => [spot.slug, spot]));
  const results = destinations
    .map((destination) => ({ destination, spot: spotsBySlug.get(destination.spotSlug) }))
    .filter((item): item is { destination: typeof destinations[number]; spot: typeof spotRows[number] } => Boolean(item.spot))
    .filter(({ spot }) => !params.pref || spot.prefecture === params.pref)
    .filter(({ spot }) => params.runStation !== "1" || spot.hasShower)
    .filter(({ spot }) => params.sento !== "1" || spot.hasSentoNearby)
    .sort((a, b) => {
      const left = getPrimaryNearbyDestinationRating(a.destination);
      const right = getPrimaryNearbyDestinationRating(b.destination);
      if (params.sort === "rating") return (right?.rating ?? -1) - (left?.rating ?? -1) || (right?.reviewCount ?? 0) - (left?.reviewCount ?? 0);
      if (params.sort === "reviews") return (right?.reviewCount ?? -1) - (left?.reviewCount ?? -1) || (right?.rating ?? 0) - (left?.rating ?? 0);
      return a.destination.rank - b.destination.rank;
    });
  const purpose = nearbyDestinationPurposeFilters.find((item) => item.slug === params.purpose);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Link href="/spots" className="text-sm font-bold text-accent hover:underline">← コースから探す</Link>
      <header className="mt-6 max-w-2xl"><p className="font-bold text-accent">RUN FOR SOMETHING</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">走る理由からさがす</h1><p className="mt-3 leading-7 text-sub">行きたい場所の近くで、走れるコースを見つけよう。Googleマップの一覧ではなく、走ったあとに寄りたい場所だけを選んでいます。</p></header>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <div className="min-w-0 space-y-5 lg:order-2"><DestinationSearchFilters params={params} /></div>
        <main className="min-w-0 lg:order-1"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-sub">{purpose ? `${purpose.label}を目的に` : "目的地から"}</p><p className="font-bold"><span className="text-2xl">{results.length}</span>件の組み合わせ</p></div><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">コースから探す <ArrowRight size={16} /></Link></div>
          {results.length ? <div className="grid gap-4 md:grid-cols-2">{results.map(({ destination, spot }) => <DestinationResultCard key={`${destination.spotSlug}:${destination.placeSlug}`} destination={destination} spot={spot} />)}</div> : <div className="rounded-xl border border-line bg-cream px-5 py-12 text-center"><MapPin className="mx-auto text-brand-dark" size={32} /><p className="mt-4 text-lg font-bold">この組み合わせは、まだ見つかっていません</p><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-sub">目的地の掲載を少しずつ増やしています。条件をひとつ外すか、コースから探してみてください。</p><Link href="/spots" className="mt-5 inline-flex rounded-lg bg-brand px-5 py-3 font-bold">コースから探す</Link></div>}
        </main>
      </div>
    </div>
  );
}
