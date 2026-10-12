import Link from "next/link";
import { SpotImage } from "./spot-image";
import { SpotVisual } from "./spot-visual";
import type { SpotSummary } from "@/lib/types";

// トップの「大会の街の有名ランニングスポット」用。横スクロールで並べる縦長の小さいカード
export function RaceSpotCard({ spot, raceName, raceDate }: { spot: SpotSummary; raceName: string; raceDate: string }) {
  const distanceKm = (spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0);
  return (
    <Link href={`/spots/${spot.slug}`} className="group block w-44 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-52">
      <div className="aspect-[4/3] overflow-hidden bg-brand/25">
        {/* eslint-disable-next-line @next/next/no-img-element -- コース地図は生成済みの固定サイズwebpで、変換を挟まず直接配信する */}
        {spot.photoUrl ? <SpotImage src={spot.photoUrl} alt={`${spot.name}の写真`} width={640} height={480} sizes="208px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : spot.hasCourse ? <img src={`/course-maps/${spot.slug}.webp`} alt={`${spot.name}のコース地図`} width={512} height={512} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <SpotVisual slug={spot.slug} distanceM={spot.distanceM} courseType={spot.courseType} tags={spot.tags} className="h-full w-full" />}
      </div>
      <div className="p-3">
        <p className="flex gap-1 text-[11px] font-bold text-sub"><span className="truncate">{raceName}</span><span className="shrink-0">{raceDate}</span></p>
        <h3 className="mt-0.5 truncate font-bold">{spot.name}</h3>
        <p className="mt-0.5 truncate text-xs text-sub">{spot.city}・{distanceKm}km</p>
      </div>
    </Link>
  );
}
