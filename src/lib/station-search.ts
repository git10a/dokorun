export type StationRecord = {
  name: string;
  prefecture: string;
  line: string;
  x: number;
  y: number;
};

const prefecturePattern = /^(北海道|東京都|大阪府|京都府|.{2,3}県)\s*/;

export function parseStationQuery(value: string) {
  const trimmed = value.trim().replace(/[　\s]+/g, " ");
  const prefecture = trimmed.match(prefecturePattern)?.[1];
  const withoutPrefecture = prefecture ? trimmed.slice(prefecture.length).trim() : trimmed;
  const name = withoutPrefecture.replace(/駅$/, "").trim();
  return { name, prefecture };
}

export function summarizeStationRecords(records: StationRecord[], requestedPrefecture?: string) {
  const valid = records.filter((station) => Number.isFinite(Number(station.x)) && Number.isFinite(Number(station.y)));
  const matching = requestedPrefecture ? valid.filter((station) => station.prefecture === requestedPrefecture) : valid;
  if (!matching.length) return { status: "not_found" as const };
  const prefectures = [...new Set(matching.map((station) => station.prefecture))];
  if (!requestedPrefecture && prefectures.length > 1) return { status: "ambiguous" as const, prefectures };
  const stations = matching.filter((station) => station.prefecture === prefectures[0]);
  return {
    status: "found" as const,
    station: {
      name: stations[0].name,
      prefecture: stations[0].prefecture,
      lat: stations.reduce((sum, station) => sum + Number(station.y), 0) / stations.length,
      lng: stations.reduce((sum, station) => sum + Number(station.x), 0) / stations.length,
    },
  };
}
