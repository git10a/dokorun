import { cumulativeDistances, type GpxPoint } from "./gpx";

export type RaceElevationPoint = { distanceM: number; elevationM: number | null; lat: number; lng: number };
export type RaceElevationBenchmark = {
  distance: "full" | "half";
  count: number;
  meanGainM: number;
};
export type RaceElevation = {
  version: 1;
  source: "gpx" | "gsi";
  routeReviewRequired?: boolean;
  // A known major climb/descent may be missing even when overall coverage is high.
  hillAdjustmentUnavailable?: boolean;
  // Generated with this profile so the comparison and course share the same data version.
  benchmark?: RaceElevationBenchmark;
  points: RaceElevationPoint[];
};

// Keep coordinates and elevation on the same distance axis, including out-and-back routes.
export function raceElevationFromPoints(points: GpxPoint[]): RaceElevation {
  const cumulative = cumulativeDistances(points);
  return {
    version: 1,
    source: "gpx",
    points: points.map((point, index) => {
      return {
        distanceM: Math.round(cumulative[index] * 100) / 100,
        lat: point.lat,
        lng: point.lng,
        elevationM: point.ele !== null && Number.isFinite(point.ele) ? point.ele : null,
      };
    }),
  };
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
  return {
    distanceM: distance,
    lat: before.lat + (after.lat - before.lat) * ratio,
    lng: before.lng + (after.lng - before.lng) * ratio,
    // Never bridge an elevation gap with an invented height.
    elevationM:
      before.elevationM === null || after.elevationM === null
        ? null
        : before.elevationM + (after.elevationM - before.elevationM) * ratio,
  };
}

export function elevationSegments(points: RaceElevationPoint[]): RaceElevationPoint[][] {
  const segments: RaceElevationPoint[][] = [];
  let current: RaceElevationPoint[] = [];
  for (const point of points) {
    if (point.elevationM === null) {
      current = [];
      continue;
    }
    if (!current.length) segments.push(current);
    current.push(point);
  }
  return segments;
}

// Estimate total ascent from the same profile as the chart, never from max - min.
// Require the whole route: even a short missing section can contain a major climb.
export function raceElevationGain(profile: RaceElevation): number | null {
  const { points } = profile;
  if (profile.routeReviewRequired || profile.hillAdjustmentUnavailable || points.length < 2) return null;
  if (
    points[0].distanceM !== 0 ||
    points.some(
      (point, index) =>
        point.elevationM === null ||
        !Number.isFinite(point.elevationM) ||
        !Number.isFinite(point.distanceM) ||
        (index > 0 && point.distanceM < points[index - 1].distanceM),
    )
  )
    return null;
  const total = points.at(-1)!.distanceM;
  if (total <= 0) return null;

  // Equal distance sampling makes the estimate independent of GPX recording density.
  // Smooth three samples at roughly 50 m spacing to reduce small elevation noise,
  // preserving start/finish heights so a continuous ascent keeps its full gain.
  const intervals = Math.ceil(total / 50);
  const elevations = Array.from(
    { length: intervals + 1 },
    (_, index) => elevationPointAtDistance(points, (index / intervals) * total)!.elevationM!,
  );
  const smoothed = elevations.map((value, index) =>
    index === 0 || index === elevations.length - 1
      ? value
      : (elevations[index - 1] + value + elevations[index + 1]) / 3,
  );
  return Math.round(smoothed.slice(1).reduce((gain, value, index) => gain + Math.max(0, value - smoothed[index]), 0));
}
