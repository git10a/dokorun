import { describe, expect, it } from "vitest";
import { lineStringToGpx } from "@/lib/gpx-export";

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
});
