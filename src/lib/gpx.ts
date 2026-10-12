import { simplifyLine } from "./simplify";
import type { CourseType, LineString } from "./types";

export type GpxPoint = { lat: number; lng: number; ele: number | null };
export type ElevationSample = { distanceM: number; elevationM: number };

export type GpxResult = {
  geojson: LineString;
  distanceM: number;
  elevationGainM: number | null;
  elevationProfile: ElevationSample[] | null;
  suggestedCourseType: Extract<CourseType, "loop" | "out_and_back">;
  startPoint: { lat: number; lng: number };
};

const earthRadiusM = 6_371_000;

export function haversine(a: Pick<GpxPoint, "lat" | "lng">, b: Pick<GpxPoint, "lat" | "lng">) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

// 各点までの累積距離(m)。cumulative[i] は points[0] から points[i] までの道のり
export function cumulativeDistances(points: Pick<GpxPoint, "lat" | "lng">[]): number[] {
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1)
    cumulative.push(cumulative[index - 1] + haversine(points[index - 1], points[index]));
  return cumulative;
}

function elevationGain(points: GpxPoint[]) {
  if (points.some((point) => point.ele === null || !Number.isFinite(point.ele))) return null;
  const values = points.map((point) => point.ele as number);
  const smoothed = values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - 2), Math.min(values.length, index + 3));
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
  return Math.round(smoothed.slice(1).reduce((sum, value, index) => sum + Math.max(0, value - smoothed[index]), 0));
}

// 道のり distance(m) の地点を線形補間で求める。cumulative は cumulativeDistances(points) の結果
export function pointAtDistance(points: GpxPoint[], cumulative: number[], distance: number): GpxPoint {
  const clamped = Math.max(0, Math.min(distance, cumulative[cumulative.length - 1]));
  let index = 1;
  while (index < cumulative.length && cumulative[index] < clamped) index += 1;
  if (index >= points.length) return points[points.length - 1];
  const segmentLength = cumulative[index] - cumulative[index - 1];
  const ratio = segmentLength === 0 ? 0 : (clamped - cumulative[index - 1]) / segmentLength;
  const beforeEle = points[index - 1].ele;
  const afterEle = points[index].ele;
  return {
    lat: points[index - 1].lat + (points[index].lat - points[index - 1].lat) * ratio,
    lng: points[index - 1].lng + (points[index].lng - points[index - 1].lng) * ratio,
    ele: beforeEle === null || afterEle === null ? null : beforeEle + (afterEle - beforeEle) * ratio,
  };
}

function buildElevationProfile(points: GpxPoint[], cumulative: number[]): ElevationSample[] | null {
  if (points.some((point) => point.ele === null || !Number.isFinite(point.ele))) return null;
  const total = cumulative[cumulative.length - 1];
  const sampleCount = Math.min(181, Math.max(2, Math.ceil(total / 100) + 1));
  return Array.from({ length: sampleCount }, (_, index) => {
    const distance = (total * index) / (sampleCount - 1);
    const point = pointAtDistance(points, cumulative, distance);
    return { distanceM: Math.round(distance), elevationM: Math.round((point.ele as number) * 10) / 10 };
  });
}

function isOutAndBack(points: GpxPoint[]) {
  const cumulative = cumulativeDistances(points);
  const total = cumulative[cumulative.length - 1];
  if (total < 300) return false;
  const distances = Array.from({ length: 19 }, (_, index) => ((index + 1) / 20) * (total / 2));
  const gaps = distances.map((distance) =>
    haversine(pointAtDistance(points, cumulative, distance), pointAtDistance(points, cumulative, total - distance)),
  );
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length <= 40 && Math.max(...gaps) <= 120;
}

export function gpxResultFromPoints(points: GpxPoint[]): GpxResult {
  if (points.length < 2) throw new Error("GPXファイルを解析できませんでした");

  const cumulative = cumulativeDistances(points);
  const distanceM = Math.round(cumulative[cumulative.length - 1]);
  const coordinates = points.map((point): [number, number] => [point.lng, point.lat]);
  let tolerance = 0.00005;
  let simplified = simplifyLine(coordinates, tolerance);
  while (simplified.length > 2000) {
    tolerance *= 2;
    simplified = simplifyLine(coordinates, tolerance);
  }
  const closed = haversine(points[0], points[points.length - 1]) <= 150;
  return {
    geojson: { type: "LineString", coordinates: simplified },
    distanceM,
    elevationGainM: elevationGain(points),
    elevationProfile: buildElevationProfile(points, cumulative),
    suggestedCourseType: closed && !isOutAndBack(points) ? "loop" : "out_and_back",
    startPoint: { lat: points[0].lat, lng: points[0].lng },
  };
}

function readElementPoint(element: Element): GpxPoint | null {
  const lat = Number(element.getAttribute("lat"));
  const lng = Number(element.getAttribute("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const rawEle = element.querySelector("ele")?.textContent;
  const ele = rawEle === undefined || rawEle === null || rawEle === "" ? null : Number(rawEle);
  return { lat, lng, ele };
}

function parseGpxDocument(document: Document): GpxResult {
  const trackPoints = Array.from(document.querySelectorAll("trkpt"));
  const routePoints = Array.from(document.querySelectorAll("rtept"));
  const points = (trackPoints.length ? trackPoints : routePoints)
    .map(readElementPoint)
    .filter((point): point is GpxPoint => Boolean(point));
  return gpxResultFromPoints(points);
}

export function parseGpxXmlInBrowser(xml: string): GpxResult {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("GPXファイルを解析できませんでした");
  return parseGpxDocument(document);
}
