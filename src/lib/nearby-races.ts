import { haversine } from "./gpx";
import { raceCourseMeta } from "./race-page";
import { splitRacesBySchedule } from "./race-schedule";
import type { RaceDef } from "./races";

// スタート地点がこの距離以内なら「近くの大会」とみなす
const NEARBY_RACE_KM = 15;

export type NearbyRace = { race: RaceDef; finished: boolean; startDistanceKm: number | null };

// スポットページの「この近くの大会」。大会側で紹介しているスポットか、スタートが近い大会を、
// 開催前→開催済みの順(それぞれ日付順)に返す
export function racesNearSpot(
  spot: { slug: string; lat: number; lng: number },
  limit = 3,
  todayKey?: string,
): NearbyRace[] {
  const { upcoming, finished } = splitRacesBySchedule(todayKey);
  return [...upcoming.map((race) => ({ race, finished: false })), ...finished.map((race) => ({ race, finished: true }))]
    .flatMap(({ race, finished: isFinished }) => {
      const start = raceCourseMeta[race.slug]?.start;
      const startDistanceKm = start ? haversine({ lat: start[0], lng: start[1] }, spot) / 1000 : null;
      const listed = race.spots.some((item) => item.slug === spot.slug);
      return listed || (startDistanceKm !== null && startDistanceKm <= NEARBY_RACE_KM)
        ? [{ race, finished: isFinished, startDistanceKm }]
        : [];
    })
    .slice(0, limit);
}
