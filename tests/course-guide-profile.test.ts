import { describe, expect, it } from "vitest";
import { rotateElevationProfile, shiftRouteDistance } from "@/lib/course-guide-profile";

describe("course guide profile", () => {
  it("shifts canonical route distances around the selected loop start", () => {
    expect(shiftRouteDistance(16_000, 16_000, 23_000)).toBe(0);
    expect(shiftRouteDistance(2_000, 16_000, 23_000)).toBe(9_000);
  });

  it("rotates the profile and closes it at the selected elevation", () => {
    const rotated = rotateElevationProfile([
      { distanceM: 0, elevationM: 10 },
      { distanceM: 5_000, elevationM: 20 },
      { distanceM: 10_000, elevationM: 30 },
      { distanceM: 15_000, elevationM: 20 },
      { distanceM: 20_000, elevationM: 10 },
    ], 10_000, 20_000);
    expect(rotated[0]).toEqual({ distanceM: 0, elevationM: 30 });
    expect(rotated.at(-1)).toEqual({ distanceM: 20_000, elevationM: 30 });
    expect(rotated.map((sample) => sample.distanceM)).toEqual([0, 5_000, 10_000, 15_000, 20_000]);
  });
});
