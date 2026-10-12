import Link from "next/link";
import { FacilityIcons } from "./facility-icons";
import { SpotImage } from "./spot-image";
import { SpotVisual } from "./spot-visual";
import { courseTypeLabels, surfaceLabels, type SpotSummary } from "@/lib/types";

export function SpotCard({ spot }: { spot: SpotSummary }) {
  const distanceKm = (spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0);
  // 未計測(null)の項目は「−」を並べず省略する。形状と路面が同じ語(トラック)なら1つにする
  const details = [...new Set([
    spot.elevationGainM !== null ? `高低差${spot.elevationGainM}m` : null,
    spot.signalsCount !== null ? `信号${spot.signalsCount}` : null,
    courseTypeLabels[spot.courseType],
    surfaceLabels[spot.surface],
  ].filter(Boolean))];

  return (
    <Link href={`/spots/${spot.slug}`} className="group flex overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-28 shrink-0 self-stretch overflow-hidden bg-brand/25 sm:w-44">
        {/* eslint-disable-next-line @next/next/no-img-element -- コース地図は生成済みの固定サイズwebpで、変換を挟まず直接配信する */}
        {spot.photoUrl ? <SpotImage src={spot.photoUrl} alt={`${spot.name}の写真`} width={640} height={360} sizes="(min-width: 640px) 176px, 112px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : spot.hasCourse ? <img src={`/course-maps/${spot.slug}.webp`} alt={`${spot.name}のコース地図`} width={512} height={512} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <SpotVisual slug={spot.slug} distanceM={spot.distanceM} courseType={spot.courseType} tags={spot.tags} className="h-full w-full" />}
      </div>
      <div className="min-w-0 flex-1 p-3 sm:p-4">
        <p className="truncate text-xs text-sub">{spot.prefecture} {spot.city}</p>
        <h3 className="mt-0.5 text-base font-bold leading-snug sm:text-lg">{spot.name}</h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-xs text-sub">
          <span className="text-ink"><strong className="text-xl font-black">{distanceKm}</strong><span className="ml-0.5 text-xs font-bold">km</span></span>
          <span>{details.join("・")}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {spot.tags.slice(0, 2).map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-2.5 py-0.5 text-xs">{tag.name}</span>)}
          <FacilityIcons spot={spot} compact />
        </div>
      </div>
    </Link>
  );
}
