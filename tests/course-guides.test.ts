import { describe, expect, it } from "vitest";
import { getCourseGuide } from "../src/lib/course-guides";
import { readdirSync } from "node:fs";

const guideSlugs = ["kamakura-issyu-trail", "teganuma-loop", "yamanote-loop"];

describe("course guides", () => {
  it("covers every published spot with a generated guide", () => {
    const slugs = readdirSync("public/course-guides").filter((name) => name.endsWith(".json")).map((name) => name.replace(/\.json$/, ""));
    expect(slugs).toHaveLength(250);
    expect(new Set(slugs).size).toBe(250);
  });

  it("validates every generated guide and its source attribution", async () => {
    const slugs = readdirSync("public/course-guides").filter((name) => name.endsWith(".json")).map((name) => name.replace(/\.json$/, ""));
    for (const slug of slugs) {
      const guide = await getCourseGuide(slug);
      expect(guide, slug).not.toBeNull();
      if (!guide) continue;
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

  it.each(guideSlugs)("registers generated guide data for %s", async (slug) => {
    const guide = await getCourseGuide(slug);
    expect(guide?.heroCheckpointId).toBeTruthy();
    expect(guide?.startPoints.length).toBeGreaterThanOrEqual(2);
    expect(guide?.checkpoints.length).toBeGreaterThanOrEqual(5);
    expect(guide?.elevationProfile.length).toBeGreaterThan(20);
    expect(guide?.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${slug}-`))).toBe(true);
    expect(guide?.startPoints.every((start) => Object.keys(start.checkpointDistances).length === guide.checkpoints.length)).toBe(true);
  });
});
