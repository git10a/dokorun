import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pageSeoOverrides, getPageSeoOverride } from "@/lib/page-seo-overrides";
import { racePageTitle, racePageDescription } from "@/lib/race-page";
import { raceBySlug } from "@/lib/races";
import { RaceDayInfoBox } from "@/components/race-day-info";
import { raceDayInfo } from "@/lib/race-day-info";
import { spotEditorial } from "@/lib/course-editorial";

const mocks = vi.hoisted(() => ({ getSpot: vi.fn() }));
vi.mock("@/db/data", () => ({ getSpotDetailWithNearby: mocks.getSpot }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }));
import { generateMetadata as spotMetadata } from "@/app/spots/[slug]/page";

afterEach(() => mocks.getSpot.mockReset());

describe("page-specific search metadata", () => {
  it("limits overrides to the five requested exact paths", () => {
    expect(Object.keys(pageSeoOverrides).sort()).toEqual([
      "/races/mito-komon-marathon",
      "/races/suwako-marathon",
      "/spots/hikarigaoka-park",
      "/spots/nagai-park",
      "/spots/nijo-castle-loop",
    ]);
    for (const path of ["/spots/kokyo", "/races/tokyo-marathon", "/spots/nagai-park/", "nagai-park", "toString"]) {
      expect(getPageSeoOverride(path)).toBeUndefined();
    }
  });

  it.each(["mito-komon-marathon", "suwako-marathon"])(
    "uses the dedicated race copy for %s with either nearby-spot state",
    (slug) => {
      const race = raceBySlug.get(slug)!;
      const seo = pageSeoOverrides[`/races/${slug}`]!;
      for (const hasNearby of [false, true]) {
        expect(racePageTitle(race, hasNearby)).toBe(seo.title);
        expect(racePageDescription(race, hasNearby)).toBe(seo.description);
        expect(seo.title).toContain("コースマップ・高低図");
        expect(seo.description).toContain("2026年大会（10月25日開催済み）");
      }
    },
  );

  it.each(["nagai-park", "nijo-castle-loop", "hikarigaoka-park"])(
    "renders %s overrides in HTML, OG and Twitter metadata",
    async (slug) => {
      mocks.getSpot.mockResolvedValue({
        spot: {
          slug,
          name: "fixture",
          tags: [],
          courseType: "loop",
          distanceM: 3000,
          description: "fixture",
          nightLighting: "bright",
          hasCourse: true,
          photos: [],
        },
      });
      const meta = await spotMetadata({ params: Promise.resolve({ slug }) });
      const seo = pageSeoOverrides[`/spots/${slug}`]!;
      expect(meta.title).toEqual({ absolute: `${seo.title} - どこラン` });
      expect(meta.description).toBe(seo.description);
      expect(meta.openGraph).toMatchObject({
        title: `${seo.title} - どこラン`,
        description: seo.description,
        images: [{ url: `/og/spots/${slug}.jpg`, width: 1200, height: 630 }],
      });
      expect(meta.twitter).toMatchObject({ title: `${seo.title} - どこラン`, description: seo.description });
      expect(meta.alternates?.canonical).toBe(`/spots/${slug}`);
    },
  );

  it("preserves the existing editorial fallback and 404 behavior for other spots", async () => {
    const slug = "shin-yokohama-park";
    mocks.getSpot.mockResolvedValue({
      spot: { slug, name: "新横浜公園", tags: [], description: "fixture", photos: [] },
    });
    const meta = await spotMetadata({ params: Promise.resolve({ slug }) });
    expect(meta.title).toEqual({ absolute: `${spotEditorial[slug]!.title} - どこラン` });
    expect(meta.description).toBe(spotEditorial[slug]!.intro);
    mocks.getSpot.mockResolvedValue(null);
    expect(await spotMetadata({ params: Promise.resolve({ slug: "missing" }) })).toEqual({
      title: "スポットが見つかりません",
    });
  });
});

describe("official race-day information", () => {
  it.each(["mito-komon-marathon", "suwako-marathon"])(
    "server-renders five sourced categories and the reference edition for %s",
    (slug) => {
      const html = renderToStaticMarkup(createElement(RaceDayInfoBox, { slug }));
      expect(html).toContain("2026年大会の情報");
      expect(html).toContain("次回大会の案内ではありません");
      expect(html).toContain('dateTime="2026-10-30"');
      expect(raceDayInfo[slug]!.items.map((item) => item.label)).toEqual([
        "アクセス",
        "駐車場",
        "関門",
        "エイド",
        "荷物預け",
      ]);
      for (const item of raceDayInfo[slug]!.items) {
        expect(item.sources.length).toBeGreaterThan(0);
        for (const source of item.sources) expect(html).toContain(`href="${source.url}"`);
      }
    },
  );
  it("identifies the completed Mito edition and uses the 2026 official checkpoint source", () => {
    const html = renderToStaticMarkup(createElement(RaceDayInfoBox, { slug: "mito-komon-marathon" }));
    expect(html).toContain("2026年10月25日開催済み");
    expect(html).toContain("70002.pdf");
    expect(html).toContain("9.5km＝10:40");
    expect(html).toContain("38.5km＝14:30");
  });
  it("adds no logistics to unresearched races", () => {
    expect(Object.keys(raceDayInfo).sort()).toEqual(["mito-komon-marathon", "suwako-marathon"]);
    expect(renderToStaticMarkup(createElement(RaceDayInfoBox, { slug: "tokyo-marathon" }))).toBe("");
  });
});
