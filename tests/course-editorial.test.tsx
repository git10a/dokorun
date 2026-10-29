import { getPageSeoOverride } from "@/lib/page-seo-overrides";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { CourseEditorial } from "@/components/course-editorial";
import { editorialLastModified, raceEditorial, spotEditorial, stationEditorial } from "@/lib/course-editorial";
import { preparePublicCourseGuide, type CourseGuide } from "@/lib/course-guides";

vi.mock("@/db/data", () => ({
  getSpotDetailWithNearby: async (slug: string) => ({
    spot: {
      slug,
      name: "テスト公園",
      tags: [],
      description: "既存の説明",
      courseType: "out-and-back",
      distanceM: 2000,
      nightLighting: "unknown",
      hasCourse: true,
      photos: [],
    },
  }),
  getSitemapSpots: async () => [],
  getSpotCommunities: async () => [],
}));
import { generateMetadata } from "@/app/spots/[slug]/page";

describe("sourced course content", () => {
  it("keeps metadata, public guide introduction and visible sources consistent", async () => {
    for (const [slug, entry] of Object.entries(spotEditorial)) {
      if (!entry) continue;
      const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
      const original = JSON.parse(readFileSync(`public/course-guides/${slug}.json`, "utf8")) as CourseGuide;
      const prepared = preparePublicCourseGuide(original);
      expect(metadata.description).toBe(getPageSeoOverride(`/spots/${slug}`)?.description ?? prepared.intro);
      expect(metadata.alternates?.canonical).toBe(`/spots/${slug}`);
      const html = renderToStaticMarkup(createElement(CourseEditorial, { entry }));
      for (const point of entry.points) {
        expect(html).toContain(point.heading);
        expect(html).toContain(point.source.url.replaceAll("&", "&amp;"));
      }
      expect(html).toContain(entry.checkedAt);
      expect(prepared.distanceM).toBe(original.distanceM);
      expect(prepared.elevationProfile).toEqual(original.elevationProfile);
    }
  });

  it("does not call an out-and-back course one lap in fallback metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "not-curated" }) });
    expect(metadata.description).toContain("コース距離2.0km");
    expect(metadata.description).not.toContain("1周");
  });

  it("removes Nagai's unrelated photos and surfaces the current Kinuta restriction first", () => {
    const load = (slug: string) => JSON.parse(readFileSync(`public/course-guides/${slug}.json`, "utf8")) as CourseGuide;
    const nagai = preparePublicCourseGuide(load("nagai-park"));
    expect(nagai.checkpoints.every((point) => !point.photo)).toBe(true);
    const kinuta = preparePublicCourseGuide(load("kinuta-park-cross-country"));
    expect(kinuta.warnings[0].title).toContain("立入制限");
    expect(kinuta.warnings[0].body).toContain("全区間が通行できることは確認できていません");
  });

  it("preserves later database updates and does not invent dates for untouched pages", () => {
    expect(editorialLastModified(undefined)).toBeUndefined();
    expect(editorialLastModified(undefined, "2026-09-01")).toBe("2026-09-01");
    expect(editorialLastModified(spotEditorial["nagai-park"], "2026-11-01")).toBe("2026-11-01");
    expect(editorialLastModified(raceEditorial["yokohama-marathon"], "2026-09-01")).toEqual(
      new Date("2026-10-14T00:00:00+09:00"),
    );
  });

  it("links curated station recommendations only to candidates already in the station catalog", () => {
    const stations = JSON.parse(readFileSync("data/stations/stations.json", "utf8")) as {
      slug: string;
      nearbySpots: { slug: string }[];
      oneStationSpots: { slug: string }[];
    }[];
    for (const [slug, entry] of Object.entries(stationEditorial)) {
      const station = stations.find((item) => item.slug === slug)!;
      const allowed = new Set([...station.nearbySpots, ...station.oneStationSpots].map((spot) => spot.slug));
      for (const item of entry!.spots) expect(allowed.has(item.slug)).toBe(true);
    }
  });
});
