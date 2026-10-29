import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { courseDistanceTicks, snapCourseDistance } from "../src/lib/course-distance";
import { RaceElevationChart } from "../src/components/race-elevation-chart";
import type { RaceElevation } from "../src/lib/race-elevation";

describe("course distance selection", () => {
  it("uses fixed 5 km labels and 1 km minor ticks on a mobile marathon chart", () => {
    const ticks = courseDistanceTicks(42_277.56, 280);
    expect(ticks.filter((tick) => tick.label).map((tick) => tick.label)).toEqual([
      "5",
      "10",
      "15",
      "20",
      "25",
      "30",
      "35",
      "40",
    ]);
    expect(ticks.find((tick) => tick.distanceM === 3000)).toEqual({ distanceM: 3000, label: null });
    expect(ticks.at(-1)?.distanceM).toBe(42000);
  });

  it("adapts labels to shorter and longer courses without crowding or relabelling the finish", () => {
    for (const [total, width] of [
      [10_000, 280],
      [800, 280],
      [100_000, 240],
      [160_000, 600],
    ]) {
      const ticks = courseDistanceTicks(total, width);
      const labels = ticks.filter((tick) => tick.label);
      expect(labels.length).toBeGreaterThan(0);
      expect(ticks.every((tick) => tick.distanceM > 0 && tick.distanceM < total)).toBe(true);
      labels.slice(1).forEach((tick, i) => {
        expect(((tick.distanceM - labels[i].distanceM) / total) * width).toBeGreaterThanOrEqual(28);
      });
    }
    expect(courseDistanceTicks(0, 280)).toEqual([]);
    expect(courseDistanceTicks(NaN, 280)).toEqual([]);
  });

  it("snaps to 100 m while keeping both endpoints reachable, including finishes that round down", () => {
    expect(snapCourseDistance(3034, 42_277.56)).toBe(3000);
    expect(snapCourseDistance(3060, 42_277.56)).toBe(3100);
    expect(snapCourseDistance(-20, 42_277.56)).toBe(0);
    for (const finish of [42_195, 42_277.56, 42_310]) {
      expect(snapCourseDistance(finish, finish)).toBe(finish);
      expect(snapCourseDistance(finish + 100, finish)).toBe(finish);
      expect(snapCourseDistance(finish - 1, finish)).toBeLessThanOrEqual(finish);
    }
  });

  it("makes the selected kilometre visible while retaining missing-elevation information", () => {
    const profile: RaceElevation = {
      version: 1,
      source: "gpx",
      points: [
        { distanceM: 0, lat: 35, lng: 139, elevationM: 50 },
        { distanceM: 3000, lat: 35.01, lng: 139, elevationM: null },
        { distanceM: 42_277.56, lat: 35.02, lng: 139, elevationM: 10 },
      ],
    };
    const html = renderToStaticMarkup(
      <RaceElevationChart profile={profile} selectedDistanceM={3000} onSelect={() => {}} />,
    );
    const text = html.replace(/<[^>]*>/g, "");
    expect(text).toContain("スタートから3.0km地点");
    expect(text).toContain("標高データなし");
    expect(text).toContain("スタート距離 kmゴール");
    expect(text).toContain("高低図をなぞると、地図で場所を確認できます");
    expect(html).toContain('aria-valuemax="42277.56"');
    expect(html).toContain('aria-valuenow="3000"');
    expect(html).not.toContain("10.6");
  });
});
