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

export function stationJogMinutes(distanceM: number) {
  return Math.round((distanceM / 1000) * 6);
}
