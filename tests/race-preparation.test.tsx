import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RaceCoursePoints } from "@/components/race-course-points";
import { raceEditorial } from "@/lib/course-editorial";
import { races } from "@/lib/races";

import research from "../data/race-preparation-research/2026-10-14.json";
import followupResearch from "../data/race-preparation-research/2026-10-15.json";

const reviewedRaces = [...new Map([...research.races, ...followupResearch.races].map((race) => [race.slug, race])).values()];

describe("race preparation source boundaries", () => {
  it("covers every race published at the research cutoff, with inspectable sources", () => {
    expect(Object.keys(raceEditorial).sort()).toEqual(reviewedRaces.map((race) => race.slug).sort());
    const catalogSlugs = new Set(races.map((race) => race.slug));
    for (const slug of Object.keys(raceEditorial)) expect(catalogSlugs.has(slug)).toBe(true);
    for (const entry of Object.values(raceEditorial)) {
      expect(entry!.points.length).toBeGreaterThan(0);
      expect(entry!.points.length).toBeLessThanOrEqual(3);
      expect(entry!.referenceLabel).toBeTruthy();
      expect(entry!.sourceNote).toBeTruthy();
      expect(entry!.sources.length).toBeGreaterThan(0);
      for (const point of entry!.points) {
        expect(point.distance).toMatch(/^\d+(?:\.\d+)?(?:〜\d+(?:\.\d+)?)?$/);
        expect(point.distanceUnit).toMatch(/^km/);
      }
      expect(new Set(entry!.sources.map((source) => source.url)).size).toBe(entry!.sources.length);
      for (const source of entry!.sources) {
        expect(new URL(source.url).protocol).toBe("https:");
        expect(["official", "experience"]).toContain(source.kind);
        if (source.kind === "experience" && source.year) {
          expect(source.year).toBeLessThanOrEqual(Number(entry!.checkedAt.slice(0, 4)));
          expect(source.label).toContain(String(source.year));
        }
      }
    }
  });

  it("locates route landmarks using the official distance markers", () => {
    expect(raceEditorial["fujisan-marathon"]!.points[2].distance).toBe("34〜35");
    expect(raceEditorial["yoron-marathon"]!.points[1].distance).toBe("22");
    expect(raceEditorial["kagawa-marathon"]!.points[1].distance).toBe("17");
    expect(raceEditorial["inuyama-half-marathon"]!.points.map((point) => point.distance)).toEqual(["6", "16"]);
    for (const race of reviewedRaces) {
      expect(race.distanceLabels).toEqual(
        raceEditorial[race.slug]!.points.map((point) => `${point.distance}${point.distanceUnit}`),
      );
    }
  });

  it("shows the actual reference edition instead of claiming the upcoming course was reviewed", () => {
    const historical = raceEditorial["makomanai-marathon"]!;
    const html = renderToStaticMarkup(createElement(RaceCoursePoints, { entry: historical }));
    expect(html).toContain("2024年大会の体験記を参考");
    expect(html).toContain("今後の周回設定と完全に一致することは未確認");
    expect(html).not.toContain("2026年コース");
    const undated = raceEditorial["ishioka-tsukubane-half-marathon"]!;
    expect(undated.courseYear).toBeUndefined();
    expect(undated.referenceLabel).toContain("年");
    expect(undated.sourceNote).toContain("開催年の明記がない");
  });

  it("uses new official routes where older race reports no longer apply", () => {
    const tokushima = raceEditorial["tokushima-marathon"]!;
    expect(tokushima.referenceLabel).toContain("2027年の新コース");
    expect(tokushima.points.some((point) => point.body.includes("ポカリスエットスタジアム"))).toBe(true);
    expect(tokushima.sourceNote).toContain("2026年までの体験記にある距離や難所は当てはめていません");
    const fukuyama = raceEditorial["fukuyama-yearend-marathon"]!;
    expect(fukuyama.intro).toContain("8.9kmを4周");
    expect(fukuyama.intro).not.toContain("6kmを7周");
    expect(fukuyama.sourceNote).toContain("2025年の体験記にある6kmを7周");
    const inuyama = raceEditorial["inuyama-half-marathon"]!;
    expect(inuyama.sourceNote).toContain("工事迂回のあった2024年");
    expect(JSON.stringify(inuyama.points)).not.toContain("最後の1km");
  });
});
