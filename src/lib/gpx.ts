import { XMLParser } from "fast-xml-parser";
import type { CourseType, LineString } from "./types";

type Point = { lat: number; lng: number; ele: number | null };
type XmlNode = Record<string, unknown>;

export type GpxResult = {
  geojson: LineString;
  distanceM: number;
  elevationGainM: number | null;
  suggestedCourseType: Extract<CourseType, "loop" | "out_and_back">;
  startPoint: { lat: number; lng: number };
};

const earthRadiusM = 6_371_000;

export function haversine(a: Pick<Point, "lat" | "lng">, b: Pick<Point, "lat" | "lng">) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function readPoint(value: Record<string, unknown>): Point | null {
  const lat = Number(value["@_lat"]);
  const lng = Number(value["@_lon"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const rawEle = value.ele;
  return { lat, lng, ele: rawEle === undefined ? null : Number(rawEle) };
}

function perpendicularDistance(point: Point, start: Point, end: Point) {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  if (dx === 0 && dy === 0) return Math.hypot(point.lng - start.lng, point.lat - start.lat);
  const t = Math.max(0, Math.min(1, ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.lng - (start.lng + t * dx), point.lat - (start.lat + t * dy));
}

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) { maxDistance = distance; index = i; }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

function elevationGain(points: Point[]) {
  if (points.some((point) => point.ele === null || !Number.isFinite(point.ele))) return null;
  const values = points.map((point) => point.ele as number);
  const smoothed = values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - 2), Math.min(values.length, index + 3));
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
  return Math.round(smoothed.slice(1).reduce((sum, value, index) => sum + Math.max(0, value - smoothed[index]), 0));
}

function pointAtDistance(points: Point[], cumulative: number[], distance: number): Point {
  const clamped = Math.max(0, Math.min(distance, cumulative[cumulative.length - 1]));
  let index = 1;
  while (index < cumulative.length && cumulative[index] < clamped) index += 1;
  if (index >= points.length) return points[points.length - 1];
  const segmentLength = cumulative[index] - cumulative[index - 1];
  const ratio = segmentLength === 0 ? 0 : (clamped - cumulative[index - 1]) / segmentLength;
  return {
    lat: points[index - 1].lat + (points[index].lat - points[index - 1].lat) * ratio,
    lng: points[index - 1].lng + (points[index].lng - points[index - 1].lng) * ratio,
    ele: null,
  };
}

function isOutAndBack(points: Point[]) {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total < 300) return false;
  const distances = Array.from({ length: 19 }, (_, index) => ((index + 1) / 20) * (total / 2));
  const gaps = distances.map((distance) =>
    haversine(pointAtDistance(points, cumulative, distance), pointAtDistance(points, cumulative, total - distance)),
  );
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length <= 40 && Math.max(...gaps) <= 120;
}

export function parseGpx(xml: string): GpxResult {
  let parsed: XmlNode;
  try {
    parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  } catch {
    throw new Error("GPXファイルを解析できませんでした");
  }
  const gpx = parsed.gpx;
  if (!gpx || typeof gpx !== "object" || Array.isArray(gpx)) throw new Error("GPXファイルを解析できませんでした");
  const gpxNode = gpx as XmlNode;
  const trackPoints = asArray(gpxNode.trk).flatMap((track) =>
    track && typeof track === "object" && !Array.isArray(track)
      ? asArray((track as XmlNode).trkseg).flatMap((segment) => segment && typeof segment === "object" && !Array.isArray(segment) ? asArray((segment as XmlNode).trkpt) : [])
      : [],
  );
  const routePoints = asArray(gpxNode.rte).flatMap((route) => route && typeof route === "object" && !Array.isArray(route) ? asArray((route as XmlNode).rtept) : []);
  const points = (trackPoints.length ? trackPoints : routePoints)
    .map((point) => point && typeof point === "object" && !Array.isArray(point) ? readPoint(point as XmlNode) : null)
    .filter((point: Point | null): point is Point => Boolean(point));
  if (points.length < 2) throw new Error("GPXファイルを解析できませんでした");

  const distanceM = Math.round(points.slice(1).reduce((sum, point, index) => sum + haversine(points[index], point), 0));
  let tolerance = 0.00005;
  let simplified = simplify(points, tolerance);
  while (simplified.length > 2000) { tolerance *= 2; simplified = simplify(points, tolerance); }
  const closed = haversine(points[0], points[points.length - 1]) <= 150;
  return {
    geojson: { type: "LineString", coordinates: simplified.map((point) => [point.lng, point.lat]) },
    distanceM,
    elevationGainM: elevationGain(points),
    suggestedCourseType: closed && !isOutAndBack(points) ? "loop" : "out_and_back",
    startPoint: { lat: points[0].lat, lng: points[0].lng },
  };
}
