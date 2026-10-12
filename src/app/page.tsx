import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { openGraph, siteConfig } from "@/lib/site";
import { ArrowRight } from "lucide-react";
import { getPrefectureCounts, getSpotSummariesBySlugs } from "@/db/data";
import { races } from "@/lib/races";
import { raceShortDate } from "@/lib/race-date";
import { raceSearchOptions, splitRacesBySchedule } from "@/lib/race-schedule";
import { RaceCard } from "@/components/race-card";
import { RaceSearch } from "@/components/race-search";
import { RaceSpotCard } from "@/components/race-spot-card";
import { SectionHeading } from "@/components/section-heading";

// cookies/headers/searchParamsを読まず表示は全ユーザー共通のためISR化。
// 開催前の大会の並びの反映が最大1日遅れるのみ(残り日数は閲覧時に再計算)
export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: openGraph({ title: siteConfig.title, description: siteConfig.description, url: "/" }),
};

export default async function HomePage() {
  const { upcoming, finished } = splitRacesBySchedule();
  // 開催が近い大会から、その街の代表スポットを1件ずつ(同じスポットは重複させない)
  const raceSpotPicks: { slug: string; raceName: string; raceDate: string }[] = [];
  for (const race of [...upcoming, ...finished]) {
    const pick = race.spots.find((item) => !raceSpotPicks.some((picked) => picked.slug === item.slug));
    if (pick) raceSpotPicks.push({ slug: pick.slug, raceName: race.name, raceDate: raceShortDate(race, false) });
    if (raceSpotPicks.length >= 8) break;
  }
  const [counts, raceSpotSummaries] = await Promise.all([
    getPrefectureCounts(),
    getSpotSummariesBySlugs(raceSpotPicks.map((item) => item.slug)),
  ]);
  const totalSpots = counts.reduce((sum, item) => sum + item.count, 0);
  const summaryBySlug = new Map(raceSpotSummaries.map((spot) => [spot.slug, spot]));
  const raceSpots = raceSpotPicks.flatMap((item) => {
    const spot = summaryBySlug.get(item.slug);
    return spot ? [{ ...item, spot }] : [];
  });
  const searchOptions = raceSearchOptions();
  return (
    <>
      <section className="bg-brand px-4 pb-10 pt-12 text-center sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-black leading-snug tracking-tight sm:text-4xl sm:leading-tight">
            <span className="inline-block">どこランは、</span>
            <span className="inline-block">マラソン大会のコースを</span>
            <span className="inline-block">予習できるサイトです。</span>
          </h1>
          {/* 3行の締めでユーザーの得になる「ゴールで笑える」だけ、文字の足元に白いマーカーを重ねて立たせる */}
          <p className="mt-5 text-sm font-bold leading-7 sm:text-lg sm:leading-8">
            {siteConfig.tagline.map((line) => (
              <span key={line} className="block">
                {line.split("ゴールで笑える").map((part, index) => (
                  <Fragment key={index}>
                    {index > 0 && (
                      <span className="bg-[linear-gradient(transparent_72%,var(--color-paper)_72%)] px-0.5">
                        ゴールで笑える
                      </span>
                    )}
                    {part}
                  </Fragment>
                ))}
              </span>
            ))}
          </p>
          <div className="relative mt-14 sm:mt-16">
            {/* 素材は左向き。検索ボックスの上を右へ走らせるため2人とも反転する */}
            <div
              className="pointer-events-none absolute -top-11 left-4 flex items-end gap-1 sm:-top-14"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 透過PNGのキャラ素材をそのまま表示する */}
              <img src="/characters/ran-happy.png" alt="" className="h-11 w-auto -scale-x-100 sm:h-14" />
              {/* eslint-disable-next-line @next/next/no-img-element -- 透過PNGのキャラ素材をそのまま表示する */}
              <img src="/characters/hashiro-happy.png" alt="" className="h-11 w-auto -scale-x-100 sm:h-14" />
            </div>
            <RaceSearch races={searchOptions} />
          </div>
          <Link
            href="/races"
            className="mt-6 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4"
          >
            全{races.length}大会の一覧を見る <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-10 sm:space-y-16 sm:pt-12 md:px-6">
        <section>
          {upcoming.length > 0 && (
            <>
              <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
                <SectionHeading>もうすぐ開催の大会</SectionHeading>
                <Link href="/races" className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent">
                  すべて見る <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {upcoming.slice(0, 6).map((race) => (
                  <RaceCard key={race.slug} race={race} />
                ))}
              </div>
            </>
          )}
          <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm">
              <span className="font-bold">出る大会が載っていない？</span>
              <span className="ml-1 text-sub">コースを掲載してほしい大会を教えてください。</span>
            </p>
            <Link
              href={`/contact?${new URLSearchParams({ category: "spot_request", message: "掲載してほしい大会：\n\n大会の公式サイト（わかれば）：\n" })}`}
              className="shrink-0 self-start rounded-lg border border-ink bg-paper px-4 py-2 text-sm font-bold hover:bg-cream sm:self-auto"
            >
              大会をリクエスト
            </Link>
          </div>
        </section>
      </div>
      <section id="spot-search" className="mx-auto mt-12 max-w-7xl scroll-mt-20 px-4 pb-4 sm:mt-16 md:px-6">
        <SectionHeading className="mb-4 sm:mb-6">大会の街の有名ランニングスポット</SectionHeading>
        {raceSpots.length > 0 && (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden">
            {raceSpots.map((item) => (
              <RaceSpotCard key={item.slug} spot={item.spot} raceName={item.raceName} raceDate={item.raceDate} />
            ))}
          </div>
        )}
        <Link
          href="/spots"
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline"
        >
          全国{totalSpots}スポットからさがす <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
