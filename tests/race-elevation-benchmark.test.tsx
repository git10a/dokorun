import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRaceElevationBenchmarks, raceElevationComparison } from "../src/lib/race-elevation-benchmark";
import { raceElevationGain, type RaceElevation } from "../src/lib/race-elevation";
import { RaceElevationChart } from "../src/components/race-elevation-chart";

const profile = (gainM: number, distanceM = 42_195): RaceElevation => ({
  version: 1,
  source: "gsi",
  points: [
    { lat: 35, lng: 139, distanceM: 0, elevationM: 0 },
    { lat: 35, lng: 140, distanceM, elevationM: gainM },
  ],
});
const course = (slug: string, value: RaceElevation, distanceLabel = "フルマラソン") => ({
  slug,
  distanceLabel,
  profile: value,
});

describe("race elevation benchmarks", () => {
  it("compares only complete listed profiles of the mapped distance, retaining zero gains", () => {
    const benchmarks = buildRaceElevationBenchmarks([
      course("flat", profile(0)),
      course("hilly", profile(300), "フル・ハーフ"),
      course("short", profile(20, 21_097), "フル・ハーフ"),
      course("short-hilly", profile(60, 21_097), "ハーフ"),
      course("missing", { ...profile(900), points: profile(900).points.map((p) => ({ ...p, elevationM: null })) }),
      course("review", { ...profile(900), routeReviewRequired: true }),
      course("tunnel", { ...profile(900), hillAdjustmentUnavailable: true }),
      course("other-distance", profile(900, 10_000)),
      course("wrong-event", profile(900), "ハーフ"),
    ]);
    expect(benchmarks).toEqual({
      flat: { distance: "full", count: 2, meanGainM: 150 },
      hilly: { distance: "full", count: 2, meanGainM: 150 },
      short: { distance: "half", count: 2, meanGainM: 40 },
      "short-hilly": { distance: "half", count: 2, meanGainM: 40 },
    });
  });

  it("withholds single-course comparisons and rejects duplicate catalog entries", () => {
    const single = course("one", profile(100));
    expect(buildRaceElevationBenchmarks([single])).toEqual({});
    expect(() => buildRaceElevationBenchmarks([single, single])).toThrow("Duplicate listed race");
  });

  it("uses the unrounded mean for both signs and handles a zero rounded difference", () => {
    const value = { ...profile(83), benchmark: { distance: "full" as const, count: 44, meanGainM: 208.113636 } };
    expect(raceElevationComparison(value, 83)).toMatchObject({ difference: "約125m少ない", meanGainM: 208 });
    expect(raceElevationComparison(value, 229)?.difference).toBe("約21m多い");
    expect(raceElevationComparison(value, 208)?.difference).toBe("ほぼ同じ");
  });

  it("renders the comparison and its denominator even after selecting a chart point", () => {
    const value = { ...profile(83), benchmark: { distance: "full" as const, count: 44, meanGainM: 208.113636 } };
    for (const selectedDistanceM of [null, 1000]) {
      const markup = renderToStaticMarkup(
        <RaceElevationChart profile={value} selectedDistanceM={selectedDistanceM} onSelect={() => {}} />,
      );
      expect(markup).toContain("掲載フル平均より");
      expect(markup).toContain("約125m少ない");
      expect(markup).toContain("比較対象44大会・平均約208m");
    }
  });

  it("does not invent a benchmark for older or incomplete profiles", () => {
    const legacy = profile(83);
    expect(raceElevationComparison(legacy, raceElevationGain(legacy))).toBeNull();
    const incomplete = {
      ...legacy,
      hillAdjustmentUnavailable: true,
      benchmark: { distance: "full" as const, count: 44, meanGainM: 208 },
    };
    const markup = renderToStaticMarkup(
      <RaceElevationChart profile={incomplete} selectedDistanceM={null} onSelect={() => {}} />,
    );
    expect(markup).not.toContain("掲載フル平均");
    expect(markup).not.toContain("比較対象");
  });
});
