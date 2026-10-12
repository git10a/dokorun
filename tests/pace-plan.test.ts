import { describe, expect, it } from "vitest";
import { buildPacePlan, canUseHills, formatDuration, gradeFactor, hillEffortLabel, pacePlanText, splitLabel } from "@/lib/pace-plan";
import type { RaceElevationPoint } from "@/lib/race-elevation";

const flat = (lengthM: number): RaceElevationPoint[] => [0, lengthM].map((distanceM) => ({ distanceM, elevationM: 10, lat: 35, lng: 139 }));

describe("buildPacePlan", () => {
  it("sums exactly to the target and covers the official distance", () => {
    const plan = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, points: null });
    expect(plan.km).toHaveLength(43);
    expect(plan.km.at(-1)!.label).toBe("42.195km");
    expect(plan.km.at(-1)!.cumulativeS).toBeCloseTo(4 * 3600, 6);
    expect(plan.km[0].splitS).toBeCloseTo(4 * 3600 / 42.195, 6);
  });

  it("lists 5km checkpoints with the halfway point and finish", () => {
    const plan = buildPacePlan({ targetS: 3 * 3600, distanceKm: 42.195, points: null });
    expect(plan.fiveKm.map((row) => row.label)).toEqual(["5km", "10km", "15km", "20km", "中間点", "25km", "30km", "35km", "40km", "ゴール"]);
    expect(plan.fiveKm.find((row) => row.label === "中間点")!.cumulativeS).toBeCloseTo(1.5 * 3600, 6);
    expect(plan.fiveKm.at(-1)!.cumulativeS).toBeCloseTo(3 * 3600, 6);
    // 中間点を挟んでも、25kmの区間は20kmからの5km
    expect(plan.fiveKm.find((row) => row.label === "25km")!.splitS).toBeCloseTo(3 * 3600 * 5 / 42.195, 6);
  });

  it("does not add a halfway row for a half marathon", () => {
    const plan = buildPacePlan({ targetS: 5400, distanceKm: 21.0975, points: null });
    expect(plan.fiveKm.map((row) => row.label)).toEqual(["5km", "10km", "15km", "20km", "ゴール"]);
  });

  it("shifts pace between halves by about splitPercent", () => {
    const negative = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, splitPercent: 2, points: null });
    const firstHalf = negative.fiveKm.find((row) => row.label === "中間点")!.cumulativeS;
    expect((4 * 3600 - firstHalf) / firstHalf).toBeCloseTo(0.98, 2);
    expect(negative.km.at(-1)!.cumulativeS).toBeCloseTo(4 * 3600, 6);
    const positive = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, splitPercent: -3, points: null });
    const positiveFirst = positive.fiveKm.find((row) => row.label === "中間点")!.cumulativeS;
    expect(4 * 3600 - positiveFirst).toBeGreaterThan(positiveFirst);
  });

  it("slows uphill kilometres and maps official distance onto a longer reference course", () => {
    // 参考コースは44km。後半22kmで標高が+220m(1%勾配)上がる
    const points: RaceElevationPoint[] = [
      { distanceM: 0, elevationM: 0, lat: 35, lng: 139 },
      { distanceM: 22000, elevationM: 0, lat: 35, lng: 139 },
      { distanceM: 44000, elevationM: 220, lat: 35, lng: 139 },
    ];
    const plan = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, points });
    expect(plan.km[30].paceS).toBeGreaterThan(plan.km[5].paceS);
    expect(plan.km[30].paceS / plan.km[5].paceS).toBeCloseTo(1.033, 2);
    expect(plan.km.at(-1)!.cumulativeS).toBeCloseTo(4 * 3600, 6);
    // 坂の頑張り具合: +2で坂を無視したイーブン、-2で補正が2倍
    const keepPace = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, hillEffort: 2, points });
    expect(keepPace.km[30].paceS / keepPace.km[5].paceS).toBeCloseTo(1, 6);
    const easeOff = buildPacePlan({ targetS: 4 * 3600, distanceKm: 42.195, hillEffort: -2, points });
    expect(easeOff.km[30].paceS / easeOff.km[5].paceS).toBeCloseTo(1.066, 2);
  });

  it("keeps an even plan when elevation is flat", () => {
    const plan = buildPacePlan({ targetS: 3600, distanceKm: 10, points: flat(10000) });
    expect(plan.km[0].splitS).toBeCloseTo(360, 6);
    expect(plan.km[9].splitS).toBeCloseTo(360, 6);
  });
});

describe("helpers", () => {
  it("clamps grade factors", () => {
    expect(gradeFactor(0)).toBe(1);
    expect(gradeFactor(20)).toBe(1.25);
    expect(gradeFactor(-20)).toBe(0.9);
    expect(gradeFactor(5, 2)).toBe(1);
  });

  it("labels slider positions", () => {
    expect(splitLabel(0)).toBe("イーブン");
    expect(splitLabel(3)).toBe("後半を3%速く");
    expect(splitLabel(-2)).toBe("前半を2%速く");
    expect(hillEffortLabel(0)).toBe("標準");
    expect(hillEffortLabel(2)).toBe("上りもペースを保つ");
  });

  it("refuses unreliable elevation", () => {
    expect(canUseHills(null)).toBe(false);
    expect(canUseHills({ points: flat(1000), routeReviewRequired: true })).toBe(false);
    expect(canUseHills({ points: flat(1000).map((point) => ({ ...point, elevationM: null })) })).toBe(false);
    expect(canUseHills({ points: flat(1000) })).toBe(true);
  });

  it("formats durations and copy text", () => {
    expect(formatDuration(338.4)).toBe("5:38");
    expect(formatDuration(3600 * 3 + 59 * 60, true)).toBe("3:59:00");
    expect(formatDuration(600, true)).toBe("0:10:00");
    const text = pacePlanText(buildPacePlan({ targetS: 5400, distanceKm: 21.0975, points: null }), "テストハーフ");
    expect(text).toContain("テストハーフ ペース表（目標 1:30:00・イーブン・坂は考慮なし）");
    expect(text).toContain("ゴール　");
    expect(text).toContain("21.0975km　");
  });
});
