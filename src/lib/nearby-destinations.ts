import batch01 from "../../data/nearby-destinations-batch-01-2026-07-08.json";
import batch02 from "../../data/nearby-destinations-batch-02-2026-07-08.json";
import batch03 from "../../data/nearby-destinations-batch-03-2026-07-08.json";
import batch05Partial from "../../data/nearby-destinations-batch-05-partial-2026-07-08.json";
import batch06Partial from "../../data/nearby-destinations-batch-06-partial-2026-07-08.json";
import batch09Partial from "../../data/nearby-destinations-batch-09-partial-2026-07-08.json";
import batch10 from "../../data/nearby-destinations-batch-10-2026-07-08.json";
import batch11 from "../../data/nearby-destinations-batch-11-2026-07-08.json";
import batch12 from "../../data/nearby-destinations-batch-12-2026-07-08.json";

export type NearbyDestinationCategory =
  | "bakery"
  | "cafe"
  | "sweets"
  | "casual_meal"
  | "restaurant"
  | "local_specialty"
  | "sento"
  | "spa"
  | "run_station"
  | "historic_site"
  | "cultural_site"
  | "market";

export type NearbyDestinationRating = {
  platform: string;
  rating: number;
  reviewCount: number;
  url: string;
};

export type NearbyDestination = {
  rank: number;
  placeSlug: string;
  name: string;
  category: NearbyDestinationCategory;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceFromSpotM: number | null;
  walkingMinutes: number | null;
  visitCondition: "direct_after_run" | "after_cleanup";
  recommendedTiming: string;
  whyWorthGoing: string;
  runnerFitReason: string;
  signatureItems?: string[];
  openingHours?: string;
  closedDays?: string;
  takeoutAvailable?: boolean;
  outdoorSeating?: boolean;
  ratings?: NearbyDestinationRating[];
  officialUrl?: string;
  imageUrl?: string;
  checkedAt?: string;
};

export const nearbyDestinationPurposeFilters = [
  { slug: "bakery", label: "パン", categories: ["bakery"] },
  { slug: "cafe", label: "カフェ", categories: ["cafe"] },
  { slug: "sauna", label: "サウナ・温浴", categories: ["sento", "spa"] },
  { slug: "meal", label: "ごはん", categories: ["casual_meal", "restaurant", "local_specialty"] },
  { slug: "run_station", label: "ランステ", categories: ["run_station"] },
] as const satisfies ReadonlyArray<{ slug: string; label: string; categories: NearbyDestinationCategory[] }>;

export type NearbyDestinationPurpose = (typeof nearbyDestinationPurposeFilters)[number]["slug"];

export const nearbyDestinationCategoryLabels: Record<NearbyDestinationCategory, string> = {
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

type NearbyDestinationResearch = {
  spotSlug: string;
  places: NearbyDestination[];
};

const destinationsBySpot = new Map(
  ([...batch01, ...batch02, ...batch03, ...batch05Partial, ...batch06Partial, ...batch09Partial, ...batch10, ...batch11, ...batch12] as NearbyDestinationResearch[]).map((entry) => [
    entry.spotSlug,
    [...entry.places].sort((a, b) => a.rank - b.rank),
  ]),
);

export type NearbyDestinationSearchItem = NearbyDestination & { spotSlug: string };

const ratingPlatformRank = ["食べログ", "Tabelog", "Google Maps"];

export function getPrimaryNearbyDestinationRating(destination: NearbyDestination) {
  return [...(destination.ratings ?? [])]
    ?.filter((rating) => Number.isFinite(rating.rating) && Number.isFinite(rating.reviewCount) && Boolean(rating.url))
    .sort((a, b) => {
      const rank = (platform: string) => {
        const index = ratingPlatformRank.indexOf(platform);
        return index === -1 ? ratingPlatformRank.length : index;
      };
      return rank(a.platform) - rank(b.platform) || b.reviewCount - a.reviewCount;
    })[0] ?? null;
}

export function ratingPlatformLabel(platform: string) {
  return platform === "Tabelog" ? "食べログ" : platform;
}

export function getNearbyDestinationHighlights(destination: NearbyDestination) {
  const highlights: string[] = [];
  if (destination.whyWorthGoing.includes("百名店")) highlights.push("百名店");
  const openingHour = destination.openingHours?.match(/(\d{1,2}):\d{2}/)?.[1];
  if (openingHour && Number(openingHour) <= 9) highlights.push(`朝${Number(openingHour)}時から`);
  if (destination.takeoutAvailable) highlights.push("テイクアウト可");
  if (destination.outdoorSeating) highlights.push("テラス席");
  return highlights;
}

export function getNearbyDestinations(spotSlug: string) {
  return destinationsBySpot.get(spotSlug) ?? [];
}

export function getNearbyDestinationsForPurpose(purpose?: string): NearbyDestinationSearchItem[] {
  const filter = nearbyDestinationPurposeFilters.find((item) => item.slug === purpose);
  const categories: readonly NearbyDestinationCategory[] | undefined = filter?.categories;

  return [...destinationsBySpot.entries()]
    .flatMap(([spotSlug, places]) => places.map((place) => ({ ...place, spotSlug })))
    .filter((item) => !categories || categories.includes(item.category))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "ja"));
}

export function googleMapsPlaceUrl(place: NearbyDestination) {
  const query = `${place.name} ${place.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
