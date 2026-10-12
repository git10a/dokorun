import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { raceElevationFromPoints, elevationPointAtDistance, elevationSegments } from "../src/lib/race-elevation";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { RaceElevationChart } from "../src/components/race-elevation-chart";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../src/lib/race-courses.json";
import type { RaceElevation } from "../src/lib/race-elevation";

const profile = raceElevationFromPoints([
  { lat: 35, lng: 139, ele: 10 },
  { lat: 35.01, lng: 139, ele: 110 },
  { lat: 35, lng: 139, ele: 10 },
]);

describe("race elevation map alignment", () => {
  it("retains the return leg distance even when it shares coordinates", () => {
    const turn = profile.points[1].distanceM;
    const outbound = elevationPointAtDistance(profile.points, turn / 2)!;
    const returning = elevationPointAtDistance(profile.points, turn * 1.5)!;
    expect(outbound.lat).toBeCloseTo(35.005, 5);
    expect(returning.lat).toBeCloseTo(outbound.lat, 5);
    expect(outbound.elevationM).toBeCloseTo(60, 2);
    expect(returning.distanceM).toBeGreaterThan(outbound.distanceM);
    expect(elevationPointAtDistance(profile.points, turn)?.elevationM).toBe(110);
  });
  it("clamps endpoints without losing the finish and rejects invalid distance", () => {
    expect(elevationPointAtDistance(profile.points, -10)).toEqual(profile.points[0]);
    expect(elevationPointAtDistance(profile.points, 100000)).toEqual(profile.points.at(-1));
    expect(elevationPointAtDistance(profile.points, NaN)).toBeNull();
    expect(elevationPointAtDistance([], 0)).toBeNull();
  });
  it("keeps missing heights as gaps instead of a fabricated descent to zero", () => {
    const points = profile.points.map((point, index) => ({ ...point, elevationM: index === 1 ? null : point.elevationM }));
    expect(elevationPointAtDistance(points, 500)?.elevationM).toBeNull();
    expect(elevationSegments(points)).toHaveLength(2);
    const markup = renderToStaticMarkup(<RaceElevationChart profile={{ ...profile, points }} selectedDistanceM={500} onSelect={() => {}} />);
    expect(markup).toContain("標高データなし");
    expect(markup).toContain("標高データのない区間は線を表示していません");
  });
  it("does not treat empty, whitespace or invalid XML elevations as zero", () => {
    const points = parseGpxPoints('<gpx><trk><trkseg><trkpt lat="35" lon="139"><ele/></trkpt><trkpt lat="35.1" lon="139"><ele> </ele></trkpt><trkpt lat="35.2" lon="139"><ele>bad</ele></trkpt><trkpt lat="35.3" lon="139"><ele>0</ele></trkpt></trkseg></trk></gpx>');
    expect(points.map((point) => point.ele)).toEqual([null, null, null, 0]);
  });
  it("distinguishes missing elevation, GPX measurements and terrain estimates", () => {
    const render = (value: typeof profile) => renderToStaticMarkup(<RaceElevationChart profile={value} selectedDistanceM={null} onSelect={() => {}} />);
    expect(render(profile)).toContain("コースデータに記録された標高");
    expect(render({ ...profile, source: "gsi" })).toContain("国土地理院の標高タイル");
    const missing = render({ ...profile, points: profile.points.map((point) => ({ ...point, elevationM: null })) });
    expect(missing).toContain("標高データは準備中");
    expect(missing).not.toContain('role="slider"');
  });
  it("shows a review notice when the route needs verification", () => {
    const markup = renderToStaticMarkup(<RaceElevationChart profile={{ ...profile, routeReviewRequired: true }} selectedDistanceM={null} onSelect={() => {}} />);
    expect(markup).toContain("コースの経路・標高を確認中です。");
  });
  it("ships aligned elevation assets for every published race course", () => {
    for (const slug of Object.keys(manifest)) {
      const xml = readFileSync(`public/race-gpx/${slug}.gpx`, "utf8");
      const route = raceElevationFromPoints(parseGpxPoints(xml));
      const generated = JSON.parse(readFileSync(`public/race-elevation/${slug}.json`, "utf8")) as RaceElevation;
      expect(generated.points.at(-1)?.distanceM).toBeCloseTo(route.points.at(-1)!.distanceM, 1);
      expect(generated.points.filter((point) => point.elevationM !== null).length).toBeGreaterThan(2);
      generated.points.forEach((point, index) => {
        expect(Number.isFinite(point.distanceM)).toBe(true);
        if (index) expect(point.distanceM).toBeGreaterThanOrEqual(generated.points[index - 1].distanceM);
        const original = elevationPointAtDistance(route.points, point.distanceM)!;
        expect(point.lat).toBeCloseTo(original.lat, 5);
        expect(point.lng).toBeCloseTo(original.lng, 5);
      });
      if (generated.source === "gsi") {
        const supplement = JSON.parse(readFileSync(`data/race-elevation/${slug}.json`, "utf8"));
        expect(supplement.gpxSha256).toBe(createHash("sha256").update(xml).digest("hex"));
      }
    }
  });
});
