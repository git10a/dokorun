import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getHomeSpots, getPrefectureCounts, getSearchTags } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { features } from "@/lib/features";
import { racesByCalendar } from "@/lib/races";
import { regionGroups } from "@/lib/prefectures";
import { HeroSearch } from "@/components/hero-search";
import { SpotCard } from "@/components/spot-card";

// cookies/headers/searchParamsを読まず表示は全ユーザー共通のためISR化。
// 人気/新着スポットや件数の反映が最大1時間遅れるのみ
export const revalidate = 3600;

export default async function HomePage() {
  const [{ popular: popularSpots, newest: newSpots }, tags, counts] = await Promise.all([getHomeSpots(), getSearchTags(), getPrefectureCounts()]);
  const countMap = new Map(counts.map((item) => [item.prefecture, item.count]));
  const totalSpots = counts.reduce((sum, item) => sum + item.count, 0);
  return (
    <>
      <section className="relative overflow-hidden bg-brand px-4 pb-10 pt-14 text-center sm:pb-12 sm:pt-20">
        <div className="mx-auto max-w-3xl"><h1 className="text-4xl font-black tracking-tight sm:text-6xl">次はどこでランする？</h1><p className="mt-4 text-sm font-medium sm:text-lg"><span className="inline-block">旅先でも、出張先でも、大会遠征でも。</span><span className="inline-block">知らない土地で走れるコースが地図つきで見つかる</span></p><p className="mt-3 inline-flex items-baseline gap-1 rounded-full bg-paper/85 px-4 py-1.5 text-xs font-bold shadow-sm sm:text-sm">全国<span className="mx-0.5 text-lg font-black text-brand-dark sm:text-xl">{totalSpots}</span>スポット・<span className="mx-0.5 text-lg font-black text-brand-dark sm:text-xl">{countMap.size}</span>都道府県を掲載中</p></div>
        <HeroSearch tags={tags} prefectureCounts={counts} />
      </section>
      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-12 md:px-6">
        <section><div className="mb-3 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">大会からさがす</h2><Link href="/races" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><p className="mb-3 text-xs leading-5 text-sub sm:-mt-3 sm:mb-5 sm:text-sm">マラソン遠征の試走・前日ランに使えるコースを大会別にまとめています。</p><div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0"><div className="grid w-max grid-flow-col grid-rows-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2.5">{racesByCalendar.map((race) => <Link key={race.slug} href={`/races/${race.slug}`} className="shrink-0 rounded-full border border-line bg-paper px-3.5 py-2 text-sm font-bold transition-colors hover:bg-cream sm:px-4">{race.name}<span className="ml-1.5 text-xs font-medium text-sub">{race.timing.replace("毎年", "")}</span></Link>)}</div></div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">エリアからさがす</h2><Link href="/areas" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{regionGroups.map((region) => { const available = region.prefectures.filter((prefecture) => countMap.has(prefecture)); return available.length ? <div key={region.name} className="rounded-xl border border-line bg-cream p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-brand-dark" />{region.name}</h3><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{available.map((prefecture) => <Link key={prefecture} href={`/areas/${prefectureSlug(prefecture)}`} className="text-accent hover:underline">{prefecture} ({countMap.get(prefecture)})</Link>)}</div></div> : null; })}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">条件からさがす</h2><Link href="/features" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="flex flex-wrap gap-2.5">{features.map((feature) => <Link key={feature.slug} href={`/features/${feature.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">{feature.emoji} {feature.name}</Link>)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">人気スポット</h2><Link href="/spots?popular=1" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{popularSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">新着スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{newSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
      </div>
    </>
  );
}
