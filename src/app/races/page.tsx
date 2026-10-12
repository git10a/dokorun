import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { RaceCard } from "@/components/race-card";
import { RaceSearch } from "@/components/race-search";
import { raceSearchOptions, splitRacesBySchedule } from "@/lib/race-schedule";
import { Breadcrumb } from "@/components/breadcrumb";

// 開催前/開催済みの振り分けを日次で更新する(残り日数は閲覧時に再計算)
export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: "マラソン大会のコースマップ・GPX・高低図をさがす",
  description: "東京マラソン、大阪マラソンなど全国の主要マラソン大会のコースマップ・GPX・高低図と、走った人の体験。目標タイムから坂を考えたペース表も作れます。",
  path: "/races",
});

export default function RacesPage() {
  const { upcoming, finished } = splitRacesBySchedule();
  const searchOptions = raceSearchOptions();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "大会からさがす" }]} />
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">大会のコースマップ・GPXをさがす</h1>
      <p className="mb-5 text-sm leading-7 text-sub">コースマップ・高低図・GPXと、走った人の体験を大会ごとにまとめています。</p>
      <div className="mb-10 max-w-xl"><RaceSearch races={searchOptions} /></div>
      {upcoming.length > 0 && <section className="mb-12"><h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">開催前の大会</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{upcoming.map((race) => <RaceCard key={race.slug} race={race} />)}</div></section>}
      {finished.length > 0 && <section><h2 className="mb-1 border-l-4 border-line pl-3 text-xl font-bold">今年は開催済みの大会</h2><p className="mb-4 pl-4 text-sm text-sub">来年に向けたコース確認に</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{finished.map((race) => <RaceCard key={race.slug} race={race} finished />)}</div></section>}
    </div>
  );
}
