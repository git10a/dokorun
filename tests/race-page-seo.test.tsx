import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { races } from "@/lib/races";
import { RaceReviews } from "@/components/race-reviews";
import { pointAlongCourse } from "@/lib/race-page";
import { raceEditorial } from "@/lib/course-editorial";
import { RaceCoursePoints } from "@/components/race-course-points";

const mocks = vi.hoisted(() => ({
  getSpots: vi.fn(async () => []),
  getReviews: vi.fn(async () => ({ available: true, reviews: [], nextOffset: null })),
}));
vi.mock("@/db/data", () => ({
  getSpotSummariesBySlugs: mocks.getSpots,
  getSitemapSpots: async () => [],
  getPrefectureCounts: async () => [],
}));
vi.mock("@/db/race-reviews", () => ({ getRaceReviews: mocks.getReviews }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }));
vi.mock("@/lib/stations", () => ({ getStations: () => [], getStationLines: () => [] }));
import RacePage, { generateMetadata, generateStaticParams } from "@/app/races/[slug]/page";
import sitemap from "@/app/sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("race page SEO preservation", () => {
  it("combines scenery and preparation on both Legacy and expanded race pages", async () => {
    const html = renderToStaticMarkup(
      await RacePage({ params: Promise.resolve({ slug: "tokyo-legacy-half-marathon" }) }),
    );
    const preparation = html.split('id="course-points"')[1].split("</section>")[0];
    expect(html).not.toContain('id="race-atmosphere"');
    expect(preparation).toContain("日本橋を渡り、最初の折り返しへ");
    expect(preparation).toContain("競技場へ戻る道は、長い上り");
    expect(preparation.match(/<figure/g)).toHaveLength(6);
    expect(html).toContain('id="course-map"');
    expect(html).toContain("日本橋を渡り、最初の折り返しへ");
    expect(html).toContain("まだ体験はありません");
    const other = renderToStaticMarkup(await RacePage({ params: Promise.resolve({ slug: "tokyo-marathon" }) }));
    expect(other).not.toContain('id="race-atmosphere"');
    const expandedPreparation = other.split('id="course-points"')[1].split("</section>")[0];
    expect(expandedPreparation.match(/<figure/g)).toHaveLength(3);
    expect(expandedPreparation).toContain("AI生成イメージ");
    expect(other).toContain('id="course-map"');
    expect(other).toContain("まだ体験はありません");
  });
  it("server-renders sourced preparation notes without inventing participant reviews", async () => {
    for (const [slug, entry] of Object.entries(raceEditorial)) {
      const html = renderToStaticMarkup(await RacePage({ params: Promise.resolve({ slug }) }));
      expect(html).toContain("コースの予習ポイント");
      for (const point of entry!.points) {
        expect(html).toContain(point.heading);
        expect(html).toContain(point.distance);
      }
      expect(html).toContain("まだ体験はありません");
      expect(html).not.toContain("AggregateRating");
    }
  });
  it("keeps sources and their reference editions in the HTML, outside the course points", () => {
    for (const entry of Object.values(raceEditorial)) {
      const html = renderToStaticMarkup(createElement(RaceCoursePoints, { entry: entry! }));
      const points = html.split("<ol")[1].split("</ol>")[0];
      expect(points).not.toContain("<a ");
      expect(points).not.toContain("確認してください");
      expect(html).toContain(entry!.referenceLabel);
      expect(html).toContain("<details");
      expect(html).not.toContain("<details open");
      for (const source of entry!.sources) expect(html).toContain(source.url.replaceAll("&", "&amp;"));
      expect(html).toContain(entry!.sourceNote);
    }
  });
  it("keeps every existing race URL, a self-canonical, and course search intent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dokorun.com");
    expect(
      generateStaticParams()
        .map((value) => value.slug)
        .sort(),
    ).toEqual(races.map((race) => race.slug).sort());
    const sitemapUrls = new Set((await sitemap()).map((page) => page.url));
    for (const race of races) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: race.slug }) });
      expect(meta.alternates?.canonical).toBe(`https://dokorun.com/races/${race.slug}`);
      expect(meta.title).toContain(race.name);
      expect(meta.title).toContain("コースマップ・高低図");
      expect(meta.description).toContain(race.startFinish);
      expect(sitemapUrls.has(`https://dokorun.com/races/${race.slug}`)).toBe(true);
      expect(meta.robots).toBeUndefined();
      // 子ページの openGraph が layout の既定画像・サイト名を消さないこと
      expect(meta.openGraph).toMatchObject({
        siteName: "どこラン",
        images: [expect.objectContaining({ url: "/og.png" })],
      });
    }
  });
  it("renders a race with no nearby spots, while unknown races remain 404", async () => {
    const page = await RacePage({ params: Promise.resolve({ slug: "itabashi-city-marathon" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("板橋Cityマラソンのコースマップ");
    expect(html).toContain("BreadcrumbList");
    expect(html).not.toContain('"@type":"ItemList"');
    expect(html).not.toContain("AggregateRating");
    // 体験がまだない大会でも、投稿への入口は出す
    expect(html).toContain("まだ体験はありません");
    expect(html).toContain("体験を書く");
    expect(html).not.toContain("ログインして体験を残す");
    expect(html).toContain("/guide/gpx");
    await expect(RacePage({ params: Promise.resolve({ slug: "not-a-race" }) })).rejects.toThrow();
  });
  it("server-renders real review text and escapes user HTML", () => {
    const html = renderToStaticMarkup(
      createElement(RaceReviews, {
        slug: "itabashi-city-marathon",
        distanceLabel: "フルマラソン",
        initial: {
          available: true,
          nextOffset: null,
          reviews: [
            {
              id: "1",
              userId: "a",
              userName: "Runner",
              userHandle: "runner",
              raceYear: 2025,
              finishTimeS: 13500,
              distanceKm: 30,
              body: '<script>alert("x")</script> 後半の向かい風',
              createdAt: "2025-03-20T00:00:00Z",
            },
          ],
        },
      }),
    );
    expect(html).toContain("後半の向かい風");
    expect(html).toContain("3:45:00");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")');
    expect(html).toContain("/u/runner");
  });
  it("places a review along measured geometry without stretching it to the official distance", () => {
    const line = {
      type: "LineString" as const,
      coordinates: [
        [139, 35],
        [139.02, 35],
      ] as [number, number][],
    };
    expect(pointAlongCourse(line, 0)).toEqual([139, 35]);
    expect(pointAlongCourse(line, 1)?.[0]).toBeGreaterThan(139);
    expect(pointAlongCourse(line, 42.195)).toBeNull();
    expect(pointAlongCourse(line, -1)).toBeNull();
  });
});
