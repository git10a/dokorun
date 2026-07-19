import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

export type StationSpot = {
  slug: string;
  distanceM: number;
  walkMinutes: number;
};

export type OneStationSpot = {
  slug: string;
  lineName: string;
  stationCount: number;
  destinationStationName: string;
  distanceM: number;
  walkMinutes: number;
};

export type Station = {
  slug: string;
  name: string;
  kana: string;
  prefecture: string;
  lat: number;
  lng: number;
  lineNames: string[];
  lines: { slug: string; name: string }[];
  nearbySpots: StationSpot[];
  oneStationSpots: OneStationSpot[];
  adjacentStations: { slug: string; name: string; lineName: string }[];
};

export type StationLine = {
  slug: string;
  name: string;
  prefectures: string[];
  isLoop: boolean;
  stations: {
    name: string;
    kana: string;
    prefecture: string;
    pageSlug: string | null;
    nearbySpots: StationSpot[];
  }[];
};

let stationCache: Station[] | null = null;
let lineCache: StationLine[] | null = null;

export function getStations(): Station[] {
  if (stationCache) return stationCache;
  const filePath = path.join(process.cwd(), "data", "stations", "stations.json");
  stationCache = JSON.parse(readFileSync(filePath, "utf8")) as Station[];
  return stationCache;
}

export function getStation(slug: string) {
  return getStations().find((station) => station.slug === slug) ?? null;
}

export function getStationsByPrefecture(prefecture: string) {
  return getStations().filter((station) => station.prefecture === prefecture);
}

export function getStationLines(): StationLine[] {
  if (lineCache) return lineCache;
  const filePath = path.join(process.cwd(), "data", "stations", "lines.json");
  lineCache = JSON.parse(readFileSync(filePath, "utf8")) as StationLine[];
  return lineCache;
}

export function getStationLine(slug: string) {
  return getStationLines().find((line) => line.slug === slug) ?? null;
}

// 「近くの路線」用の軽量インデックス。路線ごとにページのある駅の座標を等間隔に最大4点
// サンプルする(小数2桁≒1km精度で十分、gzip後は数KB)。座標つき駅がない路線は対象外
export function getNearbyLineIndex() {
  const stationBySlug = new Map(getStations().map((station) => [station.slug, station]));
  return getStationLines().flatMap((line) => {
    const coords = line.stations
      .map((station) => (station.pageSlug ? stationBySlug.get(station.pageSlug) : null))
      .filter((station) => station != null)
      .map((station) => [Number(station.lat.toFixed(2)), Number(station.lng.toFixed(2))] as [number, number]);
    if (!coords.length) return [];
    const sampleCount = Math.min(4, coords.length);
    const points = Array.from({ length: sampleCount }, (_, index) =>
      coords[Math.floor((index * (coords.length - 1)) / Math.max(1, sampleCount - 1))]);
    return [{ slug: line.slug, name: line.name, stationCount: line.stations.length, points }];
  });
}

export function stationJogMinutes(distanceM: number) {
  return Math.round((distanceM / 1000) * 6);
}
