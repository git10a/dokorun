import Link from "next/link";
import { ExternalLink, MapPin, ShowerHead, Star } from "lucide-react";
import { getNearbyDestinationHighlights, getPrimaryNearbyDestinationRating, googleMapsPlaceUrl, nearbyDestinationCategoryLabels, ratingPlatformLabel, type NearbyDestinationSearchItem } from "@/lib/nearby-destinations";
import type { SpotSummary } from "@/lib/types";

function distanceText(distanceM: number | null, walkingMinutes: number | null) {
  const distance = distanceM === null ? null : distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)}km` : `${distanceM}m`;
  const walking = walkingMinutes === null ? null : `徒歩${walkingMinutes}分`;
  return [distance, walking].filter(Boolean).join("・") || "距離未確認";
}

export function DestinationResultCard({ destination, spot }: { destination: NearbyDestinationSearchItem; spot: SpotSummary }) {
  const distanceKm = (spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0);
  const rating = getPrimaryNearbyDestinationRating(destination);
  const highlights = getNearbyDestinationHighlights(destination);
  return (
    <article className="rounded-xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-sub">{nearbyDestinationCategoryLabels[destination.category]}</span>
        <span className="flex items-center gap-1 text-xs font-bold text-accent"><MapPin size={14} aria-hidden="true" />{distanceText(destination.distanceFromSpotM, destination.walkingMinutes)}</span>
      </div>
      <h2 className="mt-3 text-xl font-bold leading-snug"><a href={googleMapsPlaceUrl(destination)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline decoration-brand decoration-2 underline-offset-4 hover:text-accent">{destination.name}<ExternalLink size={16} aria-label="Googleマップで開く" /></a></h2>
      {rating && <a href={rating.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-brand decoration-2 underline-offset-4 hover:text-accent"><Star size={16} className="fill-brand text-ink" aria-hidden="true" />{ratingPlatformLabel(rating.platform)} {rating.rating.toFixed(2)} <span className="font-normal text-sub">（{rating.reviewCount.toLocaleString("ja-JP")}件）</span><ExternalLink size={14} aria-label={`${ratingPlatformLabel(rating.platform)}で評価を見る`} /></a>}
      {destination.checkedAt && <p className="mt-1 text-xs text-sub">評価・営業情報は {destination.checkedAt.replaceAll("-", ".")} 確認</p>}
      {highlights.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{highlights.map((highlight) => <span key={highlight} className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold">{highlight}</span>)}</div>}
      <p className="mt-2 text-sm leading-7 text-sub">{destination.whyWorthGoing}</p>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-bold text-sub">この近くで走るなら</p>
        <Link href={`/spots/${spot.slug}`} className="mt-1 inline-flex text-lg font-bold hover:text-accent">{spot.name}</Link>
        <p className="mt-1 text-sm"><strong className="text-lg text-brand-dark">{distanceKm}km</strong> ・ {spot.prefecture} {spot.city}</p>
        {spot.hasShower && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold"><ShowerHead size={15} aria-hidden="true" />ランステあり</p>}
      </div>
    </article>
  );
}
