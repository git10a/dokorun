import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  raceElevationFromPoints,
  elevationPointAtDistance,
  elevationSegments,
  raceElevationGain,
  type RaceElevation,
} from "../src/lib/race-elevation";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { RaceElevationChart } from "../src/components/race-elevation-chart";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../src/lib/race-courses.json";
import { raceElevationProfile } from "../scripts/lib/race-assets";
import { canUseHills } from "../src/lib/pace-plan";

const profile = raceElevationFromPoints([
  { lat: 35, lng: 139, ele: 10 },
  { lat: 35.01, lng: 139, ele: 110 },
  { lat: 35, lng: 139, ele: 10 },
]);

describe("race elevation map alignment", () => {
  it("omits Niigata's underwater tunnel elevations and does not plan hills from the surface DEM", () => {
    const slug = "niigata-city-marathon";
    const xml = readFileSync(`data/race-gpx/${slug}.gpx`, "utf8");
    const niigata = raceElevationProfile(slug, xml);
    const tunnel = niigata.points.filter((point) => point.distanceM >= 13450 && point.distanceM <= 19050);
    expect(tunnel.length).toBeGreaterThan(100);
    expect(tunnel.every((point) => point.elevationM === null)).toBe(true);
    expect(niigata.points.filter((point) => point.elevationM !== null).length / niigata.points.length).toBeGreaterThan(
      0.8,
    );
    expect(canUseHills(niigata)).toBe(false);
    expect(raceElevationGain(niigata)).toBeNull();
  });
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
    const points = profile.points.map((point, index) => ({
      ...point,
      elevationM: index === 1 ? null : point.elevationM,
    }));
    expect(elevationPointAtDistance(points, 500)?.elevationM).toBeNull();
    expect(elevationSegments(points)).toHaveLength(2);
    const markup = renderToStaticMarkup(
      <RaceElevationChart profile={{ ...profile, points }} selectedDistanceM={500} onSelect={() => {}} />,
    );
    expect(markup).toContain("標高データなし");
    expect(markup).toContain("標高データのない区間は線を表示していません");
  });
  it("does not treat empty, whitespace or invalid XML elevations as zero", () => {
    const points = parseGpxPoints(
      '<gpx><trk><trkseg><trkpt lat="35" lon="139"><ele/></trkpt><trkpt lat="35.1" lon="139"><ele> </ele></trkpt><trkpt lat="35.2" lon="139"><ele>bad</ele></trkpt><trkpt lat="35.3" lon="139"><ele>0</ele></trkpt></trkseg></trk></gpx>',
    );
    expect(points.map((point) => point.ele)).toEqual([null, null, null, 0]);
  });
  it("distinguishes missing elevation, GPX measurements and terrain estimates", () => {
    const render = (value: typeof profile) =>
      renderToStaticMarkup(<RaceElevationChart profile={value} selectedDistanceM={null} onSelect={() => {}} />);
    expect(render(profile)).toContain("コースデータの標高");
    expect(render({ ...profile, source: "gsi" })).toContain("国土地理院データを加工");
    const missing = render({ ...profile, points: profile.points.map((point) => ({ ...point, elevationM: null })) });
    expect(missing).toContain("標高データは準備中");
    expect(missing).not.toContain('role="slider"');
  });
  it("shows a review notice when the route needs verification", () => {
    const markup = renderToStaticMarkup(
      <RaceElevationChart
        profile={{ ...profile, routeReviewRequired: true }}
        selectedDistanceM={null}
        onSelect={() => {}}
      />,
    );
    expect(markup).toContain("コースの経路・標高を確認中です。");
  });
  it("builds aligned elevation assets for every published race course", () => {
    for (const slug of Object.keys(manifest)) {
      const xml = readFileSync(`data/race-gpx/${slug}.gpx`, "utf8");
      const route = raceElevationFromPoints(parseGpxPoints(xml));
      const generated = raceElevationProfile(slug, xml);
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

describe("race elevation gain", () => {
  const fromSamples = (samples: [number, number | null][]): RaceElevation => ({
    version: 1,
    source: "gpx",
    points: samples.map(([distanceM, elevationM]) => ({ distanceM, elevationM, lat: 35, lng: 139 })),
  });
  const hills = fromSamples([
    [0, 0],
    [200, 0],
    [400, 50],
    [800, 50],
    [1000, 10],
    [1400, 10],
    [1600, 50],
    [2000, 50],
    [2200, 0],
    [2400, 0],
  ]);

  it("totals repeated climbs rather than the elevation range or the net change", () => {
    expect(raceElevationGain(hills)).toBe(90);
    expect(
      raceElevationGain(
        fromSamples([
          [0, 10],
          [1000, 110],
        ]),
      ),
    ).toBe(100);
    expect(
      raceElevationGain(
        fromSamples([
          [0, 110],
          [1000, 10],
        ]),
      ),
    ).toBe(0);
    expect(
      raceElevationGain(
        fromSamples([
          [0, 10],
          [1000, 10],
        ]),
      ),
    ).toBe(0);
  });

  it("does not inflate the result when the same route has more recorded points", () => {
    const dense = {
      ...hills,
      points: Array.from({ length: 97 }, (_, index) => elevationPointAtDistance(hills.points, index * 25)!),
    };
    expect(raceElevationGain(dense)).toBe(raceElevationGain(hills));
  });

  it("reduces small alternating elevation noise", () => {
    const noisy = fromSamples(Array.from({ length: 101 }, (_, index) => [index * 50, index % 2]));
    expect(raceElevationGain(noisy)).toBeLessThan(25); // Unfiltered ascent is 50 m.
  });

  it("withholds a total for incomplete, invalid or unverified profiles", () => {
    for (const elevation of [null, NaN, Infinity]) {
      expect(
        raceElevationGain(
          fromSamples([
            [0, 0],
            [500, elevation],
            [1000, 50],
          ]),
        ),
      ).toBeNull();
    }
    expect(raceElevationGain({ ...hills, routeReviewRequired: true })).toBeNull();
    expect(raceElevationGain({ ...hills, hillAdjustmentUnavailable: true })).toBeNull();
    expect(raceElevationGain(fromSamples([]))).toBeNull();
    expect(raceElevationGain(fromSamples([[0, 10]]))).toBeNull();
    expect(
      raceElevationGain(
        fromSamples([
          [0, 10],
          [0, 20],
        ]),
      ),
    ).toBeNull();
    expect(
      raceElevationGain(
        fromSamples([
          [100, 10],
          [1000, 20],
        ]),
      ),
    ).toBeNull();
    expect(
      raceElevationGain(
        fromSamples([
          [0, 10],
          [500, 20],
          [400, 30],
        ]),
      ),
    ).toBeNull();
  });

  it("keeps the full-course gain visible when a point is selected, including a zero gain", () => {
    for (const selectedDistanceM of [null, 1000]) {
      const markup = renderToStaticMarkup(
        <RaceElevationChart profile={hills} selectedDistanceM={selectedDistanceM} onSelect={() => {}} />,
      );
      const text = markup.replace(/<[^>]+>/g, "");
      expect(text).toContain("獲得標高（推定）約90m");
      expect(text).not.toContain("コース全体で上った高さの合計");
      expect(text).not.toContain("橋・トンネル");
    }
    const flat = renderToStaticMarkup(
      <RaceElevationChart
        profile={fromSamples([
          [0, 10],
          [1000, 10],
        ])}
        selectedDistanceM={null}
        onSelect={() => {}}
      />,
    );
    expect(flat.replace(/<[^>]+>/g, "")).toContain("獲得標高（推定）約0m");
  });

  it("does not display an incomplete or unverified total", () => {
    for (const value of [
      fromSamples([
        [0, 0],
        [500, null],
        [1000, 50],
      ]),
      { ...hills, routeReviewRequired: true },
      { ...hills, hillAdjustmentUnavailable: true },
    ]) {
      const markup = renderToStaticMarkup(
        <RaceElevationChart profile={value} selectedDistanceM={null} onSelect={() => {}} />,
      );
      expect(markup).not.toContain("獲得標高");
    }
  });
});
