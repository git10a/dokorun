import { describe, expect, it } from "vitest";
import { lineStringToGpx, pointsToGpx, reversePoints, rotateClosedLoopPoints } from "@/lib/gpx-export";

describe("lineStringToGpx", () => {
  it("exports longitude and latitude in GPX order", () => {
    const result = lineStringToGpx("皇居", { type: "LineString", coordinates: [[139.75, 35.68], [139.76, 35.69]] });
    expect(result).toContain('<trkpt lat="35.68" lon="139.75" />');
    expect(result).toContain('<trkpt lat="35.69" lon="139.76" />');
  });

  it("escapes the course name", () => {
    const result = lineStringToGpx("A & B <run>", { type: "LineString", coordinates: [[139, 35], [140, 36]] });
    expect(result).toContain("A &amp; B &lt;run&gt;");
  });

  it("rejects an empty route", () => {
    expect(() => lineStringToGpx("empty", { type: "LineString", coordinates: [] })).toThrow();
  });

  it("rotates a closed loop without changing direction or dropping elevation", () => {
    const points = [
      { lat: 35, lng: 139, ele: 10 },
      { lat: 35, lng: 139.01, ele: 20 },
      { lat: 35.01, lng: 139.01, ele: 30 },
      { lat: 35, lng: 139, ele: 10 },
    ];
    const rotated = rotateClosedLoopPoints(points, points[1]);
    expect(rotated[0]).toEqual(points[1]);
    expect(rotated.at(-1)).toEqual(points[1]);
    expect(rotated[1]).toEqual(points[2]);
    expect(pointsToGpx("loop", rotated)).toContain("<ele>20</ele>");
  });

  it("rejects start rotation for an open course", () => {
    expect(() => rotateClosedLoopPoints([
      { lat: 35, lng: 139, ele: null },
      { lat: 35, lng: 139.01, ele: null },
      { lat: 35.01, lng: 139.01, ele: null },
    ], { lat: 35, lng: 139 })).toThrow("閉じた周回コース");
  });

  it("reverses a one-way route without mutating the source", () => {
    const points = [
      { lat: 35, lng: 139, ele: 10 },
      { lat: 36, lng: 140, ele: 20 },
    ];
    expect(reversePoints(points)).toEqual([points[1], points[0]]);
    expect(points[0].lat).toBe(35);
  });
});
