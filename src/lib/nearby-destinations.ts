import batch01 from "../../data/nearby-destinations-batch-01-2026-07-08.json";
import batch02 from "../../data/nearby-destinations-batch-02-2026-07-08.json";
import batch03 from "../../data/nearby-destinations-batch-03-2026-07-08.json";

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
};

type NearbyDestinationResearch = {
  spotSlug: string;
  places: NearbyDestination[];
};

const destinationsBySpot = new Map(
  ([...batch01, ...batch02, ...batch03] as NearbyDestinationResearch[]).map((entry) => [
    entry.spotSlug,
    [...entry.places].sort((a, b) => a.rank - b.rank),
  ]),
);

export function getNearbyDestinations(spotSlug: string) {
  return destinationsBySpot.get(spotSlug) ?? [];
}

export function googleMapsPlaceUrl(place: NearbyDestination) {
  const query = `${place.name} ${place.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
