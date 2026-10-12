import Link from "next/link";
import { SpotThumbnail } from "./spot-thumbnail";
import { formatDistanceKm } from "@/lib/format";
import type { SpotSummary } from "@/lib/types";

// トップの「大会の街の有名ランニングスポット」用。横スクロールで並べる縦長の小さいカード
export function RaceSpotCard({ spot, raceName, raceDate }: { spot: SpotSummary; raceName: string; raceDate: string }) {
  const distanceKm = formatDistanceKm(spot.distanceM);
  return (
    <Link
      href={`/spots/${spot.slug}`}
      className="group block w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-52"
    >
      <div className="aspect-[4/3] overflow-hidden bg-brand/25">
        <SpotThumbnail spot={spot} sizes="208px" photoHeight={480} />
      </div>
      <div className="p-3">
        <p className="flex gap-1 text-[11px] font-bold text-sub">
          <span className="truncate">{raceName}</span>
          <span className="shrink-0">{raceDate}</span>
        </p>
        <h3 className="mt-0.5 truncate font-bold">{spot.name}</h3>
        <p className="mt-0.5 truncate text-xs text-sub">
          {spot.city}・{distanceKm}km
        </p>
      </div>
    </Link>
  );
}
