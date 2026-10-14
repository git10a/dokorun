import { describe, expect, it } from "vitest";
import {
  getCourseGuide,
  isReviewedCoursePhoto,
  preparePublicCourseGuide,
  type CourseGuide,
} from "../src/lib/course-guides";
import { readdirSync, readFileSync } from "node:fs";

const guideSlugs = ["kamakura-issyu-trail", "teganuma-loop", "yamanote-loop"];

describe("course guides", () => {
  it("covers every published spot with a generated guide", () => {
    const slugs = readdirSync("public/course-guides")
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""));
    expect(slugs).toHaveLength(250);
    expect(new Set(slugs).size).toBe(250);
  });

  it("serves every guide with only explicitly reviewed photos", async () => {
    const slugs = readdirSync("public/course-guides")
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""));
    for (const slug of slugs) {
      const guide = await getCourseGuide(slug);
      expect(guide, slug).not.toBeNull();
      if (!guide) continue;
      expect(guide.startPoints.length, guide.slug).toBeGreaterThanOrEqual(1);
      expect(guide.checkpoints.length, guide.slug).toBeGreaterThanOrEqual(5);
      expect(guide.elevationProfile.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(guide.warnings.length, guide.slug).toBeGreaterThanOrEqual(2);
      expect(
        guide.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${guide.slug}-`)),
        guide.slug,
      ).toBe(true);
      for (const checkpoint of guide.checkpoints) {
        if (!checkpoint.photo) {
          expect(checkpoint.description, guide.slug).not.toContain("写真");
          continue;
        }
        expect(isReviewedCoursePhoto(guide.slug, checkpoint), `${guide.slug}/${checkpoint.id}`).toBe(true);
        expect(checkpoint.photo.sourceUrl, guide.slug).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        expect(checkpoint.photo.license, guide.slug).toMatch(/CC|Public domain|PDM/i);
      }
    }
  });

  it.each(["yoyogi", "yoyogi-park-trail", "wangan-ariake-kasai", "nagai-park", "hattori-ryokuchi"])(
    "does not publish automatically assigned photos for %s",
    async (slug) => {
      const guide = await getCourseGuide(slug);
      expect(guide?.checkpoints.every((checkpoint) => !checkpoint.photo)).toBe(true);
      expect(guide?.checkpoints.some((checkpoint) => checkpoint.description.includes("写真"))).toBe(false);
    },
  );

  it("retains reviewed landmark photos, including stations when the course is a station loop", async () => {
    const kamakura = await getCourseGuide("kamakura-issyu-trail");
    expect(kamakura?.checkpoints.filter((checkpoint) => checkpoint.photo)).toHaveLength(6);
    const teganuma = await getCourseGuide("teganuma-loop");
    expect(teganuma?.checkpoints.filter((checkpoint) => checkpoint.photo)).toHaveLength(5);
    const yamanote = await getCourseGuide("yamanote-loop");
    expect(yamanote?.checkpoints.filter((checkpoint) => checkpoint.photo)).toHaveLength(6);
    expect(yamanote?.checkpoints.find((point) => point.id === "tokyo")?.photo?.alt).toContain("東京駅");
  });

  it("cannot transfer a review to a different image, source, course or checkpoint", () => {
    const original = JSON.parse(readFileSync("public/course-guides/kamakura-issyu-trail.json", "utf8")) as CourseGuide;
    const point = original.checkpoints[0];
    expect(isReviewedCoursePhoto(original.slug, point)).toBe(true);
    expect(isReviewedCoursePhoto("yoyogi", point)).toBe(false);
    expect(isReviewedCoursePhoto(original.slug, { ...point, id: "section-1" })).toBe(false);
    expect(
      isReviewedCoursePhoto(original.slug, {
        ...point,
        photo: { ...point.photo!, url: "https://example.com/park.jpg" },
      }),
    ).toBe(false);
    expect(
      isReviewedCoursePhoto(original.slug, {
        ...point,
        photo: { ...point.photo!, sourceUrl: "https://example.com/park" },
      }),
    ).toBe(false);
  });

  it("preserves route data and source candidates while removing unreviewed photos from the public view", () => {
    const original = JSON.parse(readFileSync("public/course-guides/yoyogi.json", "utf8")) as CourseGuide;
    const before = structuredClone(original);
    const prepared = preparePublicCourseGuide(original);
    expect(original).toEqual(before);
    expect(prepared.startPoints).toEqual(original.startPoints);
    expect(prepared.elevationProfile).toEqual(original.elevationProfile);
    expect(prepared.distanceM).toBe(original.distanceM);
    expect(
      prepared.checkpoints.map(({ id, routeDistanceM, routeLat, routeLng }) => ({
        id,
        routeDistanceM,
        routeLat,
        routeLng,
      })),
    ).toEqual(
      original.checkpoints.map(({ id, routeDistanceM, routeLat, routeLng }) => ({
        id,
        routeDistanceM,
        routeLat,
        routeLng,
      })),
    );
    expect(JSON.stringify(prepared)).not.toContain("upload.wikimedia.org");
    expect(preparePublicCourseGuide(prepared)).toEqual(prepared);
  });

  it.each(guideSlugs)("registers generated guide data for %s", async (slug) => {
    const guide = await getCourseGuide(slug);
    expect(guide?.heroCheckpointId).toBeTruthy();
    expect(guide?.startPoints.length).toBeGreaterThanOrEqual(2);
    expect(guide?.checkpoints.length).toBeGreaterThanOrEqual(5);
    expect(guide?.elevationProfile.length).toBeGreaterThan(20);
    expect(guide?.startPoints.every((start) => start.gpxHref.startsWith(`/gpx/${slug}-`))).toBe(true);
    expect(
      guide?.startPoints.every((start) => Object.keys(start.checkpointDistances).length === guide.checkpoints.length),
    ).toBe(true);
  });
});
