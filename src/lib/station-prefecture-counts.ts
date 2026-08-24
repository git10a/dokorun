import stationPrefectureCounts from "../../data/stations/prefecture-counts.json";

const counts: Record<string, number> = stationPrefectureCounts;

export function getStationCountByPrefecture(prefecture: string) {
  return counts[prefecture] ?? 0;
}
