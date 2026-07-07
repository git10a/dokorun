export type CourseType = "loop" | "out_and_back" | "one_way" | "track";
export type Surface = "asphalt" | "dirt" | "track" | "trail" | "mixed";
export type Lighting = "bright" | "partial" | "dark" | null;
export type LineString = { type: "LineString"; coordinates: [number, number][] };

export type SpotSummary = {
  id: string;
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  lat: number;
  lng: number;
  hasToilet: boolean;
  hasWaterFountain: boolean;
  hasVendingMachine: boolean;
  hasLocker: boolean;
  hasShower: boolean;
  hasSentoNearby: boolean;
  hasParking: boolean;
  hasConvenienceStore: boolean;
  distanceM: number;
  elevationGainM: number | null;
  signalsCount: number | null;
  courseType: CourseType;
  surface: Surface;
  photoUrl: string | null;
  tags: { slug: string; name: string }[];
};

export type MapSpot = Pick<SpotSummary, "slug" | "name" | "lat" | "lng" | "distanceM">;

export const courseTypeLabels: Record<CourseType, string> = {
  loop: "周回",
  out_and_back: "往復",
  one_way: "ワンウェイ",
  track: "トラック",
};

export const surfaceLabels: Record<Surface, string> = {
  asphalt: "舗装路",
  dirt: "土",
  track: "トラック",
  trail: "トレイル",
  mixed: "混合",
};
