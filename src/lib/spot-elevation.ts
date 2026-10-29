import { elevationPointAtDistance, type RaceElevation } from "./race-elevation";

export function spotDistanceFromStart(
  distanceM: number,
  totalM: number,
  startM: number,
  mode: "loop" | "forward" | "reverse",
): number {
  if (totalM <= 0) return 0;
  if (mode === "reverse") return Math.max(0, totalM - distanceM);
  if (mode === "forward") return distanceM;
  return (((distanceM - startM) % totalM) + totalM) % totalM;
}

// Transform coordinates and heights together; never infer a position from height alone.
export function spotElevationFromStart(
  profile: RaceElevation,
  startM: number,
  mode: "loop" | "forward" | "reverse",
): RaceElevation {
  const total = profile.points.at(-1)?.distanceM ?? 0;
  if (total <= 0 || mode === "forward") return profile;
  if (mode === "reverse")
    return {
      ...profile,
      points: [...profile.points].reverse().map((point) => ({ ...point, distanceM: total - point.distanceM })),
    };
  const start = ((startM % total) + total) % total;
  const origin = elevationPointAtDistance(profile.points, start);
  if (!origin) return profile;
  const points = profile.points
    .filter((point) => point.distanceM < total && point.distanceM !== start)
    .map((point) => ({ ...point, distanceM: spotDistanceFromStart(point.distanceM, total, start, mode) }))
    .sort((a, b) => a.distanceM - b.distanceM);
  return { ...profile, points: [{ ...origin, distanceM: 0 }, ...points, { ...origin, distanceM: total }] };
}
