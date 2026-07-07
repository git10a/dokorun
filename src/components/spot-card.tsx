/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FacilityIcons } from "./facility-icons";
import { SpotVisual } from "./spot-visual";
import { courseTypeLabels, surfaceLabels, type SpotSummary } from "@/lib/types";

export function SpotCard({ spot }: { spot: SpotSummary }) {
  return (
    <Link href={`/spots/${spot.slug}`} className="group overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-video overflow-hidden bg-brand/25">
        {spot.photoUrl ? <img src={spot.photoUrl} alt={`${spot.name}の写真`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <SpotVisual slug={spot.slug} distanceM={spot.distanceM} courseType={spot.courseType} tags={spot.tags} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]" />}
      </div>
      <div className="space-y-2.5 p-4">
        <p className="text-xs text-sub">{spot.prefecture} {spot.city}</p>
        <h3 className="text-lg font-bold leading-snug">{spot.name}</h3>
        <p className="text-sm"><strong className="text-lg text-brand-dark">{(spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0)}km</strong> ・ {courseTypeLabels[spot.courseType]} ・ {surfaceLabels[spot.surface]}</p>
        <div className="flex min-h-7 flex-wrap gap-1.5">{spot.tags.slice(0, 3).map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-2.5 py-1 text-xs">{tag.name}</span>)}</div>
        <FacilityIcons spot={spot} compact />
      </div>
    </Link>
  );
}
