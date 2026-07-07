import { describe, expect, it } from "vitest";
import { simplifyLine, simplifyLineToLimit, type Coordinate } from "@/lib/simplify";

describe("simplifyLine", () => {
  it("keeps endpoints and removes points close to a GPX-like line", () => {
    const coords: Coordinate[] = Array.from({ length: 101 }, (_, index) => [
      139.7 + index * 0.0001,
      35.6 + index * 0.0001 + Math.sin(index / 5) * 0.000001,
    ]);
    const result = simplifyLine(coords, 0.00001);
    expect(result[0]).toEqual(coords[0]);
    expect(result.at(-1)).toEqual(coords.at(-1));
    expect(result.length).toBeLessThan(coords.length);
  });

  it("limits long course shapes to 60 coordinates", () => {
    const coords: Coordinate[] = Array.from({ length: 3708 }, (_, index) => [
      138.85 + Math.cos(index / 30) * 0.02,
      35.42 + Math.sin(index / 30) * 0.01,
    ]);
    const result = simplifyLineToLimit(coords);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result[0]).toEqual(coords[0]);
    expect(result.at(-1)).toEqual(coords.at(-1));
  });
});
