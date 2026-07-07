import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getNewestSpots, getPopularSpots, getPrefectureCounts, getTags } from "@/db/data";
import { regionGroups } from "@/lib/prefectures";
import { HeroSearch } from "@/components/hero-search";
import { NearMeButton } from "@/components/near-me-button";
import { SpotCard } from "@/components/spot-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [popularSpots, newSpots, tags, counts] = await Promise.all([getPopularSpots(), getNewestSpots(), getTags(), getPrefectureCounts()]);
  const countMap = new Map(counts.map((item) => [item.prefecture, item.count]));
  return (
    <>
      <section className="relative bg-brand px-4 pb-8 pt-14 text-center sm:pb-28 sm:pt-20">
        <div className="mx-auto max-w-3xl"><p className="mb-3 text-sm font-bold tracking-widest">RUNNING SPOT DATABASE</p><h1 className="text-4xl font-black tracking-tight sm:text-6xl">今日、どこ走る？</h1><p className="mt-4 text-sm font-medium sm:text-lg">日本全国のランニングスポットをあつめるサイト</p></div>
        <HeroSearch tags={tags} prefectureCounts={counts} />
        <div className="mx-auto mt-5 max-w-4xl">
          <NearMeButton variant="hero" />
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-12 md:px-6">
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">人気スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{popularSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">新着スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{newSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><h2 className="mb-6 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">エリアからさがす</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{regionGroups.map((region) => { const available = region.prefectures.filter((prefecture) => countMap.has(prefecture)); return available.length ? <div key={region.name} className="rounded-xl border border-line bg-cream p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-brand-dark" />{region.name}</h3><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{available.map((prefecture) => <Link key={prefecture} href={`/spots?pref=${encodeURIComponent(prefecture)}`} className="text-accent hover:underline">{prefecture} ({countMap.get(prefecture)})</Link>)}</div></div> : null; })}</div></section>
      </div>
    </>
  );
}
