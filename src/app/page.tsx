import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Map as MapIcon, MessageSquareText, Mountain, Watch } from "lucide-react";
import { getHomeSpots, getPrefectureCounts, getSearchTags } from "@/db/data";
import { prefectureSlug } from "@/lib/areas";
import { features } from "@/lib/features";
import { races } from "@/lib/races";
import { racesByMonth, splitRacesBySchedule } from "@/lib/race-schedule";
import { regionGroups } from "@/lib/prefectures";
import { HeroSearch } from "@/components/hero-search";
import { RaceCard } from "@/components/race-card";
import { RaceSearch } from "@/components/race-search";
import { SpotCard } from "@/components/spot-card";
import { TodayRunChoices } from "@/components/today-run-choices";

// cookies/headers/searchParamsを読まず表示は全ユーザー共通のためISR化。
// 定番/新着スポットや件数、開催前の大会の並びの反映が最大1日遅れるのみ(残り日数は閲覧時に再計算)
export const revalidate = 86400;

// コースを見るだけの人もいるため手順にはせず、大会ページでわかることを並べる。GPXは使いたい人向けの1項目
const raceHighlights = [
  { Icon: MapIcon, label: "コースマップ" },
  { Icon: Mountain, label: "高低図" },
  { Icon: Watch, label: "GPX" },
  { Icon: MessageSquareText, label: "走った人の体験" },
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", type: "website" },
};

export default async function HomePage() {
  const [{ classic: classicSpots, newest: newSpots }, tags, counts] = await Promise.all([getHomeSpots(), getSearchTags(), getPrefectureCounts()]);
  const countMap = new Map(counts.map((item) => [item.prefecture, item.count]));
  const totalSpots = counts.reduce((sum, item) => sum + item.count, 0);
  const { upcoming } = splitRacesBySchedule();
  const monthGroups = racesByMonth();
  const upcomingSlugs = new Set(upcoming.map((race) => race.slug));
  const searchOptions = [...upcoming, ...splitRacesBySchedule().finished].map((race) => ({ slug: race.slug, name: race.name, prefecture: race.prefecture, date: race.timing.replace(/^\d{4}年(\d+)月(\d+)日/, "$1/$2") }));
  return (
    <>
      <section className="bg-brand px-4 pb-10 pt-12 text-center sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-black leading-snug tracking-tight sm:text-4xl sm:leading-tight"><span className="inline-block">どこランは、</span><span className="inline-block">マラソン大会のコースを</span><span className="inline-block">予習できるサイトです。</span></h1>
          {/* 3行の締めでユーザーの得になる「ゴールで笑える」だけ、文字の足元に白いマーカーを重ねて立たせる */}
          <p className="mt-5 text-sm font-bold leading-7 sm:text-lg sm:leading-8"><span className="block">コースを知れば、ペースが変わる。</span><span className="block">ペースが変われば、タイムが縮む。</span><span className="block">タイムが縮めば、<span className="bg-[linear-gradient(transparent_72%,var(--color-paper)_72%)] px-0.5">ゴールで笑える</span>。</span></p>
          <div className="relative mt-14 sm:mt-16">
            {/* 素材は左向き。検索ボックスの上を右へ走らせるため2人とも反転する */}
            <div className="pointer-events-none absolute -top-11 left-4 flex items-end gap-1 sm:-top-14" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- 透過PNGのキャラ素材をそのまま表示する */}
              <img src="/characters/ran-happy.png" alt="" className="h-11 w-auto -scale-x-100 sm:h-14" />
              {/* eslint-disable-next-line @next/next/no-img-element -- 透過PNGのキャラ素材をそのまま表示する */}
              <img src="/characters/hashiro-happy.png" alt="" className="h-11 w-auto -scale-x-100 sm:h-14" />
            </div>
            <RaceSearch races={searchOptions} />
          </div>
          <ul className="mx-auto mt-6 grid max-w-lg grid-cols-4 gap-2 text-[11px] font-bold leading-4 sm:text-xs" aria-label="大会ページでわかること">
            {raceHighlights.map(({ Icon, label }) => <li key={label} className="flex flex-col items-center gap-1.5"><span className="grid size-11 place-items-center rounded-full bg-paper/80"><Icon size={20} aria-hidden="true" /></span>{label}</li>)}
          </ul>
          <Link href="/races" className="mt-6 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4">全{races.length}大会の一覧を見る <ArrowRight size={16} /></Link>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-10 sm:space-y-16 sm:pt-12 md:px-6">
        {upcoming.length > 0 && <section><div className="mb-4 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">もうすぐ開催の大会</h2><Link href="/races" className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{upcoming.slice(0, 6).map((race) => <RaceCard key={race.slug} race={race} />)}</div></section>}
        <section><h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold sm:mb-6 sm:text-2xl">開催月からさがす</h2><div className="divide-y divide-line rounded-xl border border-line bg-cream">{monthGroups.map(({ month, races: monthRaces }) => <div key={month} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:px-5"><h3 className="text-sm font-bold">{month}月{monthRaces.every((race) => !upcomingSlugs.has(race.slug)) && <span className="block text-[10px] font-medium text-sub">今年は終了</span>}</h3><div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">{monthRaces.map((race) => <Link key={race.slug} href={`/races/${race.slug}`} className="font-bold text-accent hover:underline">{race.name}</Link>)}</div></div>)}</div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border-2 border-dashed border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-sm"><span className="font-bold">出る大会が載っていない？</span><span className="ml-1 text-sub">コース・GPXを作ってほしい大会を教えてください。</span></p><Link href={`/contact?${new URLSearchParams({ category: "spot_request", message: "掲載してほしい大会：\n\n大会の公式サイト（わかれば）：\n" })}`} className="shrink-0 self-start rounded-lg border border-ink bg-paper px-4 py-2 text-sm font-bold hover:bg-cream sm:self-auto">大会をリクエスト</Link></div>
        </section>
      </div>
      <section id="spot-search" className="mt-14 scroll-mt-20 bg-cream px-4 pb-12 pt-10 sm:mt-20 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-black sm:text-3xl">旅先・近所のランニングコース</h2>
          <p className="mt-2 text-sm text-sub">大会で訪れる街の有名スポットから、ふだんのジョグまで。全国{totalSpots}スポット</p>
          <HeroSearch tags={tags} />
        </div>
        <div className="mx-auto mt-10 max-w-7xl md:px-2">
          <h3 className="mb-4 font-bold sm:text-lg">今日は、どう走る？</h3>
          <TodayRunChoices />
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-12 sm:space-y-16 md:px-6">
        <section><div className="mb-4 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">エリアからさがす</h2><Link href="/areas" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="divide-y divide-line rounded-xl border border-line bg-cream sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 sm:px-5 sm:py-2 lg:grid-cols-3">{regionGroups.map((region) => { const available = region.prefectures.filter((prefecture) => countMap.has(prefecture)); return available.length ? <div key={region.name} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:block sm:px-0"><h3 className="text-sm font-bold sm:mb-2">{region.name}</h3><div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm">{available.map((prefecture) => <Link key={prefecture} href={`/areas/${prefectureSlug(prefecture)}`} className="text-accent hover:underline">{prefecture}<span className="ml-0.5 text-xs text-sub">{countMap.get(prefecture)}</span></Link>)}</div></div> : null; })}</div></section>
        <section><div className="mb-4 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">条件からさがす</h2><Link href="/features" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="flex flex-wrap gap-2.5">{features.map((feature) => <Link key={feature.slug} href={`/features/${feature.slug}`} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold hover:bg-cream">{feature.emoji} {feature.name}</Link>)}</div></section>
        <section><div className="mb-4 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">定番スポット</h2><Link href="/spots" className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-3 sm:gap-4 lg:grid-cols-2">{classicSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div></section>
        <section><div className="mb-4 flex items-end justify-between gap-4 sm:mb-6"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">新着スポット</h2><Link href="/spots" className="flex items-center gap-1 text-sm font-bold text-accent">すべて見る <ArrowRight size={16} /></Link></div><div className="grid gap-3 sm:gap-4 lg:grid-cols-2">{newSpots.map((spot, index) => <div key={spot.id} className={index >= 2 ? "hidden sm:block" : undefined}><SpotCard spot={spot} /></div>)}</div></section>
      </div>
    </>
  );
}
