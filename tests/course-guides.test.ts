import { describe, expect, it } from "vitest";
import { getCourseGuide } from "../src/lib/course-guides";
import { generatedCourseGuides } from "../src/generated/course-guides";

const guideSlugs = ["kamakura-issyu-trail", "teganuma-loop", "yamanote-loop"];

describe("course guides", () => {
  it("covers every published spot with a generated guide", () => {
    expect(generatedCourseGuides).toHaveLength(250);
    expect(new Set(generatedCourseGuides.map((guide) => guide.slug)).size).toBe(250);
    for (const guide of generatedCourseGuides) {
      expect(guide.startPoints.length, guide.slug).toBeGreaterThanOrEqual(1);
      expect(guide.checkpoints.length, guide.slug).toBeGreaterThanOrEqual(5);
      expect(guide.elevationProfile.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.warnings.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${guide.slug}-`)), guide.slug).toBe(true);
      for (const checkpoint of guide.checkpoints) {
        if (!("photo" in checkpoint) || !checkpoint.photo) continue;
        expect(checkpoint.photo.sourceUrl, guide.slug).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        expect(checkpoint.photo.license, guide.slug).toMatch(/CC|Public domain|PDM/i);
      }
    }
  });

  it.each(guideSlugs)("registers generated guide data for %s", (slug) => {
    const guide = getCourseGuide(slug);
    expect(guide?.heroCheckpointId).toBeTruthy();
    expect(guide?.startPoints.length).toBeGreaterThanOrEqual(2);
    expect(guide?.checkpoints.length).toBeGreaterThanOrEqual(5);
    expect(guide?.elevationProfile.length).toBeGreaterThan(20);
    expect(guide?.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${slug}-`))).toBe(true);
    expect(guide?.startPoints.every((start) => Object.keys(start.checkpointDistances).length === guide.checkpoints.length)).toBe(true);
  });
});
