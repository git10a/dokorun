import { describe, expect, it } from "vitest";
import { getCourseGuide } from "../src/lib/course-guides";

const guideSlugs = ["kamakura-issyu-trail", "teganuma-loop", "yamanote-loop"];

describe("course guides", () => {
  it.each(guideSlugs)("registers generated guide data for %s", (slug) => {
    const guide = getCourseGuide(slug);
    expect(guide?.heroCheckpointId).toBeTruthy();
    expect(guide?.startPoints.length).toBeGreaterThanOrEqual(2);
    expect(guide?.checkpoints.length).toBeGreaterThanOrEqual(5);
    expect(guide?.elevationProfile.length).toBeGreaterThan(20);
    expect(guide?.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${slug}-`))).toBe(true);
  });
});
