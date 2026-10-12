import { haversine, type GpxPoint } from "./gpx";

export type RaceElevationPoint = { distanceM: number; elevationM: number | null; lat: number; lng: number };
export type RaceElevation = {
  version: 1;
  source: "gpx" | "gsi";
  routeReviewRequired?: boolean;
  points: RaceElevationPoint[];
};

// Keep coordinates and elevation on the same distance axis, including out-and-back routes.
export function raceElevationFromPoints(points: GpxPoint[]): RaceElevation {
  let distanceM = 0;
  return { version: 1, source: "gpx", points: points.map((point, index) => {
    if (index) distanceM += haversine(points[index - 1], point);
    return { distanceM: Math.round(distanceM * 100) / 100, lat: point.lat, lng: point.lng,
      elevationM: point.ele !== null && Number.isFinite(point.ele) ? point.ele : null };
  }) };
}

export function elevationPointAtDistance(points: RaceElevationPoint[], distanceM: number): RaceElevationPoint | null {
  if (!points.length || !Number.isFinite(distanceM)) return null;
  const distance = Math.max(0, Math.min(distanceM, points.at(-1)!.distanceM));
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].distanceM < distance) low = middle + 1;
    else high = middle;
  }
  const after = points[low];
  if (low === 0 || after.distanceM === distance) return { ...after };
  const before = points[low - 1];
  const span = after.distanceM - before.distanceM;
  const ratio = span > 0 ? (distance - before.distanceM) / span : 0;
  return { distanceM: distance,
    lat: before.lat + (after.lat - before.lat) * ratio,
    lng: before.lng + (after.lng - before.lng) * ratio,
    // Never bridge an elevation gap with an invented height.
    elevationM: before.elevationM === null || after.elevationM === null ? null
      : before.elevationM + (after.elevationM - before.elevationM) * ratio };
}

export function elevationSegments(points: RaceElevationPoint[]): RaceElevationPoint[][] {
  const segments: RaceElevationPoint[][] = [];
  let current: RaceElevationPoint[] = [];
  for (const point of points) {
    if (point.elevationM === null) { current = []; continue; }
    if (!current.length) segments.push(current);
    current.push(point);
  }
  return segments;
}
