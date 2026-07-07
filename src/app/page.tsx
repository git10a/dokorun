import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { getNewestSpots, getPrefectureCounts, getTags } from "@/db/data";
import { prefectures, regionGroups } from "@/lib/prefectures";
import { SpotCard } from "@/components/spot-card";
import { TagChip } from "@/components/tag-chip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [newSpots, tags, counts] = await Promise.all([getNewestSpots(), getTags(), getPrefectureCounts()]);
  const countMap = new Map(counts.map((item) => [item.prefecture, item.count]));
  return (
    <>
      <section className="relative bg-brand px-4 pb-8 pt-14 text-center sm:pb-28 sm:pt-20">
        <div className="mx-auto max-w-3xl"><p className="mb-3 text-sm font-bold tracking-widest">RUNNING SPOT DATABASE</p><h1 className="text-4xl font-black tracking-tight sm:text-6xl">今日、どこ走る？</h1><p className="mt-4 text-sm font-medium sm:text-lg">日本全国のランニングスポットをあつめるサイト</p></div>
        <form action="/spots" className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl border border-line bg-paper p-4 text-left shadow-lg sm:absolute sm:inset-x-4 sm:-bottom-12 sm:mt-0 sm:grid-cols-[1fr_190px_auto] sm:p-5">
          <label className="relative"><span className="sr-only">キーワード</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={19} /><input name="q" placeholder="スポット名・市区町村" className="h-12 w-full rounded-lg border border-line pl-10 pr-3 outline-none focus:border-ink" /></label>
          <label><span className="sr-only">都道府県</span><select name="pref" className="h-12 w-full rounded-lg border border-line bg-paper px-3"><option value="">全国からさがす</option>{prefectures.map((prefecture) => <option key={prefecture}>{prefecture}</option>)}</select></label>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-7 font-bold text-white hover:bg-ink/85"><Search size={18} />さがす</button>
        </form>
      </section>
      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-12 sm:pt-28 md:px-6">
        <section><h2 className="mb-6 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">タグからさがす</h2><div className="flex flex-wrap gap-2">{tags.map((tag) => <TagChip key={tag.id} slug={tag.slug} name={tag.name} />)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">新着スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{newSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><h2 className="mb-6 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">エリアからさがす</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{regionGroups.map((region) => { const available = region.prefectures.filter((prefecture) => countMap.has(prefecture)); return available.length ? <div key={region.name} className="rounded-xl border border-line bg-cream p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-brand-dark" />{region.name}</h3><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{available.map((prefecture) => <Link key={prefecture} href={`/spots?pref=${encodeURIComponent(prefecture)}`} className="text-accent hover:underline">{prefecture} ({countMap.get(prefecture)})</Link>)}</div></div> : null; })}</div></section>
      </div>
    </>
  );
}
