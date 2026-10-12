/* eslint-disable @next/next/no-img-element -- 生成済みの固定サイズwebpを直接配信する */
import { RaceCountdown } from "./race-countdown";
import { jstTodayKey, raceDateKey, raceShortDate } from "@/lib/race-date";
import type { RaceDef } from "@/lib/races";

// scripts/build-race-thumbnails.ts で生成済みの固定サイズwebpを直接配信する(next/image の変換を挟まない)。開催済みはグレーにする
export function RaceThumb({
  race,
  finished,
  alt,
  className = "",
}: {
  race: Pick<RaceDef, "slug">;
  finished: boolean;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={`/race-thumbs/${race.slug}.webp`}
      alt={alt}
      width={800}
      height={500}
      loading="lazy"
      decoding="async"
      className={`${className} ${finished ? "opacity-70 grayscale" : ""}`}
    />
  );
}

// 「あと○日」と開催日の行。開催済みならカウントダウンを出さず、dateLabel で差し替えられる
export function RaceDateLine({
  race,
  finished,
  dateLabel = raceShortDate(race),
}: {
  race: Pick<RaceDef, "timing">;
  finished: boolean;
  dateLabel?: string;
}) {
  const dateKey = raceDateKey(race);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">
      {dateKey && !finished && (
        <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} className="px-2 py-0.5" />
      )}
      <span>{dateLabel}</span>
    </p>
  );
}
