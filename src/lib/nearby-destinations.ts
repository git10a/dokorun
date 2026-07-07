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
  ([...batch01, ...batch02, ...batch03, ...batch05Partial, ...batch06Partial, ...batch09Partial, ...batch10, ...batch11, ...batch12] as NearbyDestinationResearch[]).map((entry) => [
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
