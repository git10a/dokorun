import { RaceCountdown } from "./race-countdown";
import { TrackedNextLink } from "./tracked-link";
import { jstTodayKey, raceDateKey, raceShortDate } from "@/lib/race-date";
import type { NearbyRace } from "@/lib/nearby-races";

// スポットページから大会ページへの導線。検索で来たスポット閲覧者に、近くの大会のコースを案内する
export function NearbyRaces({ items, spotSlug }: { items: NearbyRace[]; spotSlug: string }) {
  return (
    <section>
      <h2 className="mb-4 border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">この近くの大会</h2>
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map(({ race, finished, startDistanceKm }) => {
          const dateKey = raceDateKey(race);
          return (
            <li key={race.slug}>
              <TrackedNextLink href={`/races/${race.slug}`} event="spot_race_link" meta={{ spot: spotSlug, race: race.slug, finished }} className="group flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-paper p-2 pr-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element -- scripts/build-race-thumbnails.tsで生成済みの固定サイズwebpを直接配信する */}
                <img src={`/race-thumbs/${race.slug}.webp`} alt="" width={800} height={500} loading="lazy" decoding="async" className={`aspect-[16/10] w-28 shrink-0 rounded-lg object-cover sm:w-32 ${finished ? "opacity-70 grayscale" : ""}`} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">{dateKey && !finished && <RaceCountdown dateKey={dateKey} serverTodayKey={jstTodayKey()} className="px-2 py-0.5" />}<span>{finished ? "今年は開催済み" : raceShortDate(race)}</span></p>
                  <h3 className="mt-0.5 font-bold leading-snug group-hover:text-accent">{race.name}</h3>
                  <p className="mt-0.5 text-xs text-sub">{race.distanceLabel}{startDistanceKm !== null && `・スタートまで約${startDistanceKm < 10 ? startDistanceKm.toFixed(1) : Math.round(startDistanceKm)}km`}</p>
                </div>
              </TrackedNextLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
