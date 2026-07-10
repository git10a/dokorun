import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getHomeSpots, getPrefectureCounts, getSearchTags } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { features } from "@/lib/features";
import { regionGroups } from "@/lib/prefectures";
import { HeroSearch } from "@/components/hero-search";
import { NearMeButton, NearMeButtonHeroFallback } from "@/components/near-me-button";
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
      <section className="relative overflow-hidden bg-brand px-4 pb-28 pt-14 text-center sm:pb-28 sm:pt-20">
        <img src="/characters/ran-happy.png" alt="走るラン" className="pointer-events-none absolute bottom-2 left-[2%] w-16 -scale-x-100 sm:left-[4%] sm:w-24 lg:w-28 xl:w-36" />
        <img src="/characters/hashiro-smile.png" alt="走るハシロー" className="pointer-events-none absolute bottom-2 right-[2%] w-16 sm:right-[4%] sm:w-24 lg:w-28 xl:w-36" />
        <div className="mx-auto max-w-3xl"><h1 className="text-4xl font-black tracking-tight sm:text-6xl">次はどこでランする？</h1><p className="mt-4 text-sm font-medium sm:text-lg">日本全国のランニングスポットをあつめるサイト</p><p className="mt-3 inline-flex items-baseline gap-1 rounded-full bg-paper/85 px-4 py-1.5 text-xs font-bold shadow-sm sm:text-sm">全国<span className="mx-0.5 text-lg font-black text-brand-dark sm:text-xl">{totalSpots}</span>スポット・<span className="mx-0.5 text-lg font-black text-brand-dark sm:text-xl">{countMap.size}</span>都道府県を掲載中</p></div>
        <HeroSearch tags={tags} prefectureCounts={counts} />
        <div className="mx-auto mt-5 max-w-4xl">
          <Suspense fallback={<NearMeButtonHeroFallback />}>
            <NearMeButton variant="hero" />
          </Suspense>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-12 md:px-6">
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">人気スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{popularSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">新着スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-5 lg:grid-cols-2">{newSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">条件からさがす</h2><Link href="/features" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="flex flex-wrap gap-2.5">{features.map((feature) => <Link key={feature.slug} href={`/features/${feature.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">{feature.emoji} {feature.name}</Link>)}</div></section>
        <section><div className="mb-6 flex items-end justify-between gap-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">エリアからさがす</h2><Link href="/areas" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{regionGroups.map((region) => { const available = region.prefectures.filter((prefecture) => countMap.has(prefecture)); return available.length ? <div key={region.name} className="rounded-xl border border-line bg-cream p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><MapPin size={18} className="text-brand-dark" />{region.name}</h3><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{available.map((prefecture) => <Link key={prefecture} href={`/areas/${prefectureSlug(prefecture)}`} className="text-accent hover:underline">{prefecture} ({countMap.get(prefecture)})</Link>)}</div></div> : null; })}</div></section>
      </div>
    </>
  );
}
