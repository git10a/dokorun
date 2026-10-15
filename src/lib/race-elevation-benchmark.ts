import { raceElevationGain, type RaceElevation, type RaceElevationBenchmark } from "./race-elevation";

type ListedCourse = { slug: string; distanceLabel: string; profile: RaceElevation };

// Classify the mapped course, not every distance offered by a multi-event race.
function distanceGroup(distanceM: number, label: string): RaceElevationBenchmark["distance"] | null {
  if (distanceM >= 40_000 && distanceM <= 45_000 && label.includes("フル")) return "full";
  if (distanceM >= 20_000 && distanceM <= 22_000 && label.includes("ハーフ")) return "half";
  return null;
}

export function buildRaceElevationBenchmarks(courses: ListedCourse[]): Record<string, RaceElevationBenchmark> {
  const seen = new Set<string>();
  const eligible = courses.flatMap(({ slug, distanceLabel, profile }) => {
    if (seen.has(slug)) throw new Error(`Duplicate listed race: ${slug}`);
    seen.add(slug);
    const gainM = raceElevationGain(profile);
    const distance = distanceGroup(profile.points.at(-1)?.distanceM ?? 0, distanceLabel);
    return gainM !== null && distance ? [{ slug, gainM, distance }] : [];
  });
  const result: Record<string, RaceElevationBenchmark> = {};
  for (const distance of ["full", "half"] as const) {
    const group = eligible.filter((course) => course.distance === distance);
    // A single course is not a useful comparison with other listed races.
    if (group.length < 2) continue;
    const meanGainM = group.reduce((sum, course) => sum + course.gainM, 0) / group.length;
    for (const course of group) result[course.slug] = { distance, count: group.length, meanGainM };
  }
  return result;
}

export function raceElevationComparison(profile: RaceElevation, gainM: number | null) {
  const benchmark = profile.benchmark;
  if (
    gainM === null ||
    !benchmark ||
    !["full", "half"].includes(benchmark.distance) ||
    !Number.isInteger(benchmark.count) ||
    benchmark.count < 2 ||
    !Number.isFinite(benchmark.meanGainM) ||
    benchmark.meanGainM < 0
  )
    return null;
  const deltaM = Math.round(gainM - benchmark.meanGainM);
  const distanceLabel = benchmark.distance === "full" ? "フル" : "ハーフ";
  return {
    distanceLabel,
    deltaM,
    difference:
      deltaM === 0 ? "ほぼ同じ" : `約${Math.abs(deltaM).toLocaleString("ja-JP")}m${deltaM > 0 ? "多い" : "少ない"}`,
    count: benchmark.count,
    meanGainM: Math.round(benchmark.meanGainM),
  };
}
