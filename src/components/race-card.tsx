import Link from "next/link";
import { RaceDateLine, RaceThumb } from "@/components/race-thumb";
import { raceShortDate } from "@/lib/race-date";
import type { RaceDef } from "@/lib/races";

export function RaceCard({ race, finished = false }: { race: RaceDef; finished?: boolean }) {
  return (
    <Link
      href={`/races/${race.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[16/10] bg-cream">
        <RaceThumb
          race={race}
          finished={finished}
          alt={`${race.name}のコースマップ`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <RaceDateLine
          race={race}
          finished={finished}
          dateLabel={`${raceShortDate(race)}・${race.prefecture.replace(/[都府県]$/, "")}`}
        />
        <h3 className="mt-0.5 font-bold leading-snug group-hover:text-accent sm:text-lg">{race.name}</h3>
        <p className="mt-auto pt-1.5 text-xs text-sub">{race.distanceLabel}</p>
      </div>
    </Link>
  );
}
