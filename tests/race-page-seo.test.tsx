import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { races } from "@/lib/races";
import { RaceReviews } from "@/components/race-reviews";
import { pointAlongCourse } from "@/lib/race-page";

const mocks = vi.hoisted(() => ({ getSpots: vi.fn(async () => []), getReviews: vi.fn(async () => ({ available: true, reviews: [], nextOffset: null })) }));
vi.mock("@/db/data", () => ({ getSpotSummariesBySlugs: mocks.getSpots, getSitemapSpots: async () => [], getPrefectureCounts: async () => [] }));
vi.mock("@/db/race-reviews", () => ({ getRaceReviews: mocks.getReviews }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }));
vi.mock("@/lib/stations", () => ({ getStations: () => [], getStationLines: () => [] }));
import RacePage, { generateMetadata, generateStaticParams } from "@/app/races/[slug]/page";
import sitemap from "@/app/sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("race page SEO preservation", () => {
  it("keeps every existing race URL, a self-canonical, and course search intent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dokorun.com");
    expect(generateStaticParams().map((value) => value.slug).sort()).toEqual(races.map((race) => race.slug).sort());
    const sitemapUrls = new Set((await sitemap()).map((page) => page.url));
    for (const race of races) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: race.slug }) });
      expect(meta.alternates?.canonical).toBe(`https://dokorun.com/races/${race.slug}`);
      expect(meta.title).toContain(race.name);
      expect(meta.title).toContain("コースマップ・高低図");
      expect(meta.description).toContain(race.startFinish);
      expect(sitemapUrls.has(`https://dokorun.com/races/${race.slug}`)).toBe(true);
      expect(meta.robots).toBeUndefined();
    }
  });
  it("renders a race with no nearby spots, while unknown races remain 404", async () => {
    const page = await RacePage({ params: Promise.resolve({ slug: "itabashi-city-marathon" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("板橋Cityマラソンのコースマップ");
    expect(html).toContain("BreadcrumbList");
    expect(html).not.toContain('"@type":"ItemList"');
    expect(html).not.toContain("AggregateRating");
    expect(html).toContain("来年この大会を走るランナーへ、あなたが伝えておきたいことは？");
    expect(html).toContain("/guide/gpx");
    await expect(RacePage({ params: Promise.resolve({ slug: "not-a-race" }) })).rejects.toThrow();
  });
  it("server-renders real review text and escapes user HTML", () => {
    const html = renderToStaticMarkup(createElement(RaceReviews, { slug: "itabashi-city-marathon", maxKm: 42.195, distanceLabel: "フルマラソン", initial: {
      available: true, nextOffset: null, reviews: [{ id: "1", userId: "a", userName: "Runner", userHandle: "runner", raceYear: 2025, finishTimeS: 13500, distanceKm: 30, body: '<script>alert("x")</script> 後半の向かい風', createdAt: "2025-03-20T00:00:00Z" }],
    } }));
    expect(html).toContain("後半の向かい風");
    expect(html).toContain("3:45:00");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")');
    expect(html).toContain('/u/runner');
  });
  it("places a review along measured geometry without stretching it to the official distance", () => {
    const line = { type: "LineString" as const, coordinates: [[139, 35], [139.02, 35]] as [number, number][] };
    expect(pointAlongCourse(line, 0)).toEqual([139, 35]);
    expect(pointAlongCourse(line, 1)?.[0]).toBeGreaterThan(139);
    expect(pointAlongCourse(line, 42.195)).toBeNull();
    expect(pointAlongCourse(line, -1)).toBeNull();
  });
});
