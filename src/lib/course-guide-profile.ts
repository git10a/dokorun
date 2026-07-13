import type { ElevationSample } from "@/lib/gpx";

export function shiftRouteDistance(distanceM: number, startDistanceM: number, totalDistanceM: number) {
  const shifted = (distanceM - startDistanceM + totalDistanceM) % totalDistanceM;
  return Math.round(shifted);
}

function elevationAtDistance(profile: ElevationSample[], distanceM: number) {
  const exact = profile.find((sample) => sample.distanceM === distanceM);
  if (exact) return exact.elevationM;
  const afterIndex = profile.findIndex((sample) => sample.distanceM > distanceM);
  if (afterIndex <= 0) return profile[0].elevationM;
  if (afterIndex < 0) return profile.at(-1)!.elevationM;
  const before = profile[afterIndex - 1];
  const after = profile[afterIndex];
  const ratio = (distanceM - before.distanceM) / (after.distanceM - before.distanceM);
  return Math.round((before.elevationM + (after.elevationM - before.elevationM) * ratio) * 10) / 10;
}

export function rotateElevationProfile(profile: ElevationSample[], startDistanceM: number, totalDistanceM: number) {
  if (!profile.length || startDistanceM <= 0) return profile;
  const startElevation = elevationAtDistance(profile, startDistanceM);
  const shifted = profile
    .filter((sample) => sample.distanceM !== totalDistanceM)
    .map((sample) => ({
      distanceM: shiftRouteDistance(sample.distanceM, startDistanceM, totalDistanceM),
      elevationM: sample.elevationM,
    }))
    .filter((sample) => sample.distanceM > 0 && sample.distanceM < totalDistanceM)
    .sort((a, b) => a.distanceM - b.distanceM);
  return [
    { distanceM: 0, elevationM: startElevation },
    ...shifted,
    { distanceM: totalDistanceM, elevationM: startElevation },
  ];
}

export function reverseElevationProfile(profile: ElevationSample[], totalDistanceM: number) {
  return [...profile]
    .map((sample) => ({
      distanceM: Math.round(totalDistanceM - sample.distanceM),
      elevationM: sample.elevationM,
    }))
    .sort((a, b) => a.distanceM - b.distanceM);
}
