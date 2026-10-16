import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { spotElevationFromStart, spotDistanceFromStart } from "../src/lib/spot-elevation";
import { elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";
import { RaceElevationChart } from "../src/components/race-elevation-chart";
import spots from "../data/spot-experience/published-spots.json";

const profile: RaceElevation = {
  version: 1,
  source: "gpx",
  points: [
    { distanceM: 0, lat: 35, lng: 139, elevationM: 10 },
    { distanceM: 100, lat: 35.01, lng: 139, elevationM: 50 },
    { distanceM: 200, lat: 35.01, lng: 139.01, elevationM: 30 },
    { distanceM: 300, lat: 35, lng: 139, elevationM: 10 },
  ],
};

describe("spot elevation and map share the selected start", () => {
  it("wraps a loop from an interpolated start without losing coordinates or heights", () => {
    const rotated = spotElevationFromStart(profile, 150, "loop");
    expect(rotated.points.map((p) => p.distanceM)).toEqual([0, 50, 150, 250, 300]);
    expect(rotated.points[0]).toEqual({ distanceM: 0, lat: 35.01, lng: 139.005, elevationM: 40 });
    expect(rotated.points.at(-1)).toEqual({ ...rotated.points[0], distanceM: 300 });
    expect(elevationPointAtDistance(rotated.points, 50)).toEqual({ ...profile.points[2], distanceM: 50 });
    expect(spotDistanceFromStart(100, 300, 150, "loop")).toBe(250);
  });
  it("reverses heights and map positions together", () => {
    const reversed = spotElevationFromStart(profile, 300, "reverse");
    expect(reversed.points[1]).toEqual({ ...profile.points[2], distanceM: 100 });
    expect(spotDistanceFromStart(200, 300, 300, "reverse")).toBe(100);
    expect(spotElevationFromStart(profile, 0, "forward")).toBe(profile);
  });
  it("preserves missing elevations through rotation", () => {
    const missing = {
      ...profile,
      points: profile.points.map((p, i) => ({ ...p, elevationM: i === 1 ? null : p.elevationM })),
    };
    expect(spotElevationFromStart(missing, 150, "loop").points[0].elevationM).toBeNull();
  });
  it("has complete position and elevation data for every published spot, including the page without a guide", () => {
    expect(spots).toHaveLength(251);
    for (const spot of spots) {
      const value = JSON.parse(readFileSync(`public/spot-elevation/${spot.slug}.json`, "utf8")) as RaceElevation;
      expect(value.points.length, spot.slug).toBeGreaterThan(1);
      expect(value.points[0].distanceM, spot.slug).toBe(0);
      expect(
        value.points.every(
          (p, i) =>
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng) &&
            Number.isFinite(p.elevationM) &&
            (i === 0 || p.distanceM >= value.points[i - 1].distanceM),
        ),
        spot.slug,
      ).toBe(true);
    }
  });
  it("keeps every guide start aligned with the mapped route and the shared chart", () => {
    for (const spot of spots.filter((s) => s.slug !== "midoriko")) {
      const value = JSON.parse(readFileSync(`public/spot-elevation/${spot.slug}.json`, "utf8")) as RaceElevation;
      const guide = JSON.parse(readFileSync(`public/course-guides/${spot.slug}.json`, "utf8"));
      expect(Math.abs(value.points.at(-1)!.distanceM - guide.distanceM), spot.slug).toBeLessThan(1);
      for (const start of guide.startPoints) {
        const transformed = spotElevationFromStart(value, start.routeDistanceM, start.routeMode);
        const origin = transformed.points[0];
        expect(Math.abs(origin.lat - start.routeLat), spot.slug).toBeLessThan(0.002);
        expect(Math.abs(origin.lng - start.routeLng), spot.slug).toBeLessThan(0.002);
        expect(
          transformed.points.every((p, i) => i === 0 || p.distanceM >= transformed.points[i - 1].distanceM),
          spot.slug,
        ).toBe(true);
      }
    }
  });
  it("withholds ascent for the course whose recorded route differs from the park", () => {
    const value = JSON.parse(
      readFileSync("public/spot-elevation/21st-century-forest-park.json", "utf8"),
    ) as RaceElevation;
    expect(value.routeReviewRequired).toBe(true);
  });
  it("credits terrain data and does not show race comparisons on spots", () => {
    const markup = renderToStaticMarkup(
      <RaceElevationChart
        profile={{
          ...profile,
          attribution: { label: "Open-Meteo（CC BY 4.0）", url: "https://open-meteo.com/en/docs/elevation-api" },
        }}
        selectedDistanceM={150}
        onSelect={() => {}}
      />,
    );
    expect(markup).toContain("Open-Meteo（CC BY 4.0）");
    expect(markup).toContain("タップで地点を確認");
    expect(markup).not.toContain("平均との比較");
  });
});
