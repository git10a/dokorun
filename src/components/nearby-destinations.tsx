import { ExternalLink, Footprints, MapPin, ShowerHead } from "lucide-react";
import {
  googleMapsPlaceUrl,
  type NearbyDestination,
  type NearbyDestinationCategory,
} from "@/lib/nearby-destinations";

const categoryLabels: Record<NearbyDestinationCategory, string> = {
  bakery: "パン",
  cafe: "カフェ",
  sweets: "甘味",
  casual_meal: "気軽なごはん",
  restaurant: "レストラン",
  local_specialty: "ご当地グルメ",
  sento: "銭湯",
  spa: "温浴施設",
  run_station: "ランステ",
  historic_site: "史跡",
  cultural_site: "文化・見どころ",
  market: "複合施設",
};

function formatDistance(distanceM: number | null, walkingMinutes: number | null) {
  const distance = distanceM === null
    ? null
    : distanceM >= 1000
      ? `${(distanceM / 1000).toFixed(1)}km`
      : `${distanceM}m`;
  const walking = walkingMinutes === null ? null : `徒歩${walkingMinutes}分`;
  return [distance, walking].filter(Boolean).join("・") || "距離未確認";
}

export function NearbyDestinations({ places }: { places: NearbyDestination[] }) {
  if (places.length === 0) return null;

  return (
    <section>
      <div className="mb-5 border-l-4 border-brand pl-3">
        <h2 className="text-xl font-bold sm:text-2xl">走ったあと、行ってみる？</h2>
        <p className="mt-1 text-sm text-sub">この場所まで来たら、少し足を延ばしたい立ち寄り先</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {places.map((place) => {
          const direct = place.visitCondition === "direct_after_run";
          return (
            <article key={place.placeSlug} className="flex flex-col rounded-xl border border-line bg-paper p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-sub">
                  {categoryLabels[place.category]}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-accent">
                  <MapPin size={14} aria-hidden="true" />
                  {formatDistance(place.distanceFromSpotM, place.walkingMinutes)}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug">
                <a
                  href={googleMapsPlaceUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 underline decoration-brand decoration-2 underline-offset-4 hover:text-accent"
                >
                  {place.name}
                  <ExternalLink size={15} aria-label="Googleマップで開く" />
                </a>
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-sub">{place.whyWorthGoing}</p>
              <div className="mt-4 border-t border-line pt-3">
                <p className="flex items-center gap-2 text-xs font-bold">
                  {direct ? <Footprints size={15} aria-hidden="true" /> : <ShowerHead size={15} aria-hidden="true" />}
                  {direct ? "ランニング直後に寄りやすい" : "汗を流したあとにおすすめ"}
                  <span className="font-normal text-sub">・{place.recommendedTiming}</span>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
