import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gpx-node";

const wrap = (points: string) => `<?xml version="1.0"?><gpx><trk><trkseg>${points}</trkseg></trk></gpx>`;

describe("parseGpx", () => {
  it("calculates a straight-line distance within one percent", () => {
    const result = parseGpx(wrap('<trkpt lat="35" lon="139"><ele>0</ele></trkpt><trkpt lat="35.01" lon="139"><ele>10</ele></trkpt>'));
    expect(result.distanceM).toBeGreaterThan(1100);
    expect(result.distanceM).toBeLessThan(1125);
  });

  it("detects a loop", () => {
    const result = parseGpx(wrap('<trkpt lat="35" lon="139"><ele>0</ele></trkpt><trkpt lat="35" lon="139.01"><ele>2</ele></trkpt><trkpt lat="35.01" lon="139.01"><ele>5</ele></trkpt><trkpt lat="35.01" lon="139"><ele>2</ele></trkpt><trkpt lat="35" lon="139"><ele>0</ele></trkpt>'));
    expect(result.suggestedCourseType).toBe("loop");
  });

  it("detects an out-and-back route that returns to its start", () => {
    const result = parseGpx(wrap('<trkpt lat="35" lon="139"><ele>0</ele></trkpt><trkpt lat="35.005" lon="139.005"><ele>2</ele></trkpt><trkpt lat="35.01" lon="139.01"><ele>5</ele></trkpt><trkpt lat="35.005" lon="139.005"><ele>2</ele></trkpt><trkpt lat="35" lon="139"><ele>0</ele></trkpt>'));
    expect(result.suggestedCourseType).toBe("out_and_back");
  });

  it("returns null elevation when any elevation is missing", () => {
    const result = parseGpx(wrap('<trkpt lat="35" lon="139"><ele>0</ele></trkpt><trkpt lat="35.01" lon="139"/>'));
    expect(result.elevationGainM).toBeNull();
    expect(result.elevationProfile).toBeNull();
  });

  it("creates a bounded elevation profile that keeps both endpoints", () => {
    const points = Array.from({ length: 250 }, (_, index) => `<trkpt lat="${35 + index * 0.0001}" lon="139"><ele>${index % 20}</ele></trkpt>`).join("");
    const result = parseGpx(wrap(points));
    expect(result.elevationProfile?.length).toBeLessThanOrEqual(181);
    expect(result.elevationProfile?.[0]).toEqual({ distanceM: 0, elevationM: 0 });
    expect(result.elevationProfile?.at(-1)?.distanceM).toBe(result.distanceM);
  });

  it("rejects malformed input", () => {
    expect(() => parseGpx("<broken>")).toThrow("GPXファイルを解析できませんでした");
  });

  it("parses route points", () => {
    const result = parseGpx('<?xml version="1.0"?><gpx><rte><rtept lat="35" lon="139"/><rtept lat="35.01" lon="139"/></rte></gpx>');
    expect(result.distanceM).toBeGreaterThan(1000);
  });
});
