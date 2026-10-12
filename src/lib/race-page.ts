import type { RaceDef } from "./races";
import manifest from "./race-courses.json";
import { haversine } from "./gpx";
import type { LineString } from "./types";

// start/finishは参考コースの始点・終点 [lat, lng]
export type RaceCourseMeta = {
  distanceM: number;
  elevationGainM: number | null;
  source: "gps" | "map";
  courseYear?: number;
  checkedAt?: string;
  sourceUrl?: string;
  start?: number[];
  finish?: number[];
};
export const raceCourseMeta = manifest as Record<string, RaceCourseMeta | undefined>;
export const racePageTitle = (race: RaceDef) => `${race.name}のコースマップ・高低図`;
// 大会ページの説明は、コースの予習とレース計画の価値に統一する。
export const racePageDescription = (race: RaceDef) =>
  `${race.name}（${race.distanceLabel}・${race.startFinish}）のコースマップ・高低図。目標タイムから坂を考えたペース表も作れます。走った人の体験や、近くの有名ランニングスポットも紹介。`;

// Distances follow the reference geometry; they are not certified race kilometre markers.
export function pointAlongCourse(geometry: LineString, km: number): [number, number] | null {
  if (!Number.isFinite(km) || km < 0 || !geometry.coordinates.length) return null;
  let remaining = km * 1000;
  for (let i = 1; i < geometry.coordinates.length; i++) {
    const a = geometry.coordinates[i - 1];
    const b = geometry.coordinates[i];
    const length = haversine({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });
    if (remaining <= length) {
      const fraction = length ? remaining / length : 0;
      return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
    }
    remaining -= length;
  }
  return null;
}
