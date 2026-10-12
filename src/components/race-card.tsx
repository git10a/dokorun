import Link from "next/link";
import { RaceCountdown } from "@/components/race-countdown";
import { jstTodayKey, raceDateKey, raceShortDate } from "@/lib/race-date";
import type { RaceDef } from "@/lib/races";

export function RaceCard({ race, finished = false }: { race: RaceDef; finished?: boolean }) {
  const dateKey = raceDateKey(race);
  return (
    <Link href={`/races/${race.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[16/10] bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element -- scripts/build-race-thumbnails.tsで生成済みの固定サイズwebpを直接配信する */}
        <img src={`/race-thumbs/${race.slug}.webp`} alt={`${race.name}のコースマップ`} width={800} height={500} loading="lazy" decoding="async" className={`h-full w-full object-cover ${finished ? "opacity-70 grayscale" : ""}`} />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">{dateKey && !finished && <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} className="px-2 py-0.5" />}<span>{raceShortDate(race)}・{race.prefecture.replace(/[都府県]$/, "")}</span></p>
        <h3 className="mt-0.5 font-bold leading-snug group-hover:text-accent sm:text-lg">{race.name}</h3>
        <p className="mt-auto pt-1.5 text-xs text-sub">{race.distanceLabel}</p>
      </div>
    </Link>
  );
}
