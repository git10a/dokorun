import { RaceDateLine, RaceThumb } from "./race-thumb";
import { TrackedNextLink } from "./tracked-link";
import { raceShortDate } from "@/lib/race-date";
import type { NearbyRace } from "@/lib/nearby-races";
import { SectionHeading } from "@/components/section-heading";

// スポットページから大会ページへの導線。検索で来たスポット閲覧者に、近くの大会のコースを案内する
export function NearbyRaces({ items, spotSlug }: { items: NearbyRace[]; spotSlug: string }) {
  return (
    <section>
      <SectionHeading className="mb-4">この近くの大会</SectionHeading>
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map(({ race, finished, startDistanceKm }) => {
          return (
            <li key={race.slug}>
              <TrackedNextLink href={`/races/${race.slug}`} event="spot_race_link" meta={{ spot: spotSlug, race: race.slug, finished }} className="group flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-paper p-2 pr-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <RaceThumb race={race} finished={finished} alt="" className="aspect-[16/10] w-28 shrink-0 rounded-lg object-cover sm:w-32" />
                <div className="min-w-0">
                  <RaceDateLine race={race} finished={finished} dateLabel={finished ? "今年は開催済み" : raceShortDate(race)} />
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
