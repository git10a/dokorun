import type { Metadata } from "next";
import Link from "next/link";
import { RaceCard } from "@/components/race-card";
import { RaceSearch } from "@/components/race-search";
import { splitRacesBySchedule } from "@/lib/race-schedule";

// 開催前/開催済みの振り分けを日次で更新する(残り日数は閲覧時に再計算)
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "マラソン大会のコースマップ・高低図をさがす",
  description: "東京マラソン、大阪マラソンなど全国の主要マラソン大会のコースマップ・高低図と、走った人の体験。目標タイムから坂を考えたペース表も作れます。",
  alternates: { canonical: "/races" },
  openGraph: { url: "/races" },
};

export default function RacesPage() {
  const { upcoming, finished } = splitRacesBySchedule();
  const searchOptions = [...upcoming, ...finished].map((race) => ({ slug: race.slug, name: race.name, prefecture: race.prefecture, date: race.timing.replace(/^\d{4}年(\d+)月(\d+)日/, "$1/$2") }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <nav aria-label="パンくず" className="mb-4 text-sm text-sub"><Link href="/" className="hover:underline">ホーム</Link> / 大会からさがす</nav>
      <h1 className="mb-3 text-2xl font-bold sm:text-3xl">大会のコースをさがす</h1>
      <p className="mb-5 text-sm leading-7 text-sub">出る大会のコースと坂を確認し、目標タイムからペース表を作れます。コースを対応ウォッチに取り込んだり、完走者の体験を読んだりして、レースの準備に役立ててください。</p>
      <div className="mb-10 max-w-xl"><RaceSearch races={searchOptions} /></div>
      {upcoming.length > 0 && <section className="mb-12"><h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold">開催前の大会</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{upcoming.map((race) => <RaceCard key={race.slug} race={race} />)}</div></section>}
      {finished.length > 0 && <section><h2 className="mb-1 border-l-4 border-line pl-3 text-xl font-bold">今年は開催済みの大会</h2><p className="mb-4 pl-4 text-sm text-sub">走った経験を次の出場者へ。来年に向けたコースの予習にも。</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{finished.map((race) => <RaceCard key={race.slug} race={race} finished />)}</div></section>}
    </div>
  );
}
