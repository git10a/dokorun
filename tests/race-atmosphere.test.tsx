import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getRaceAtmosphere } from "@/lib/race-atmosphere";
import { RaceCoursePoints } from "@/components/race-course-points";
import { raceEditorial } from "@/lib/course-editorial";
import { elevationPointAtDistance, type RaceElevation } from "@/lib/race-elevation";
import additionalAtmospheres from "@/lib/race-atmosphere-scenes.json";
import { raceCourseMeta } from "@/lib/race-page";
import { races } from "@/lib/races";

const slug = "tokyo-legacy-half-marathon";

describe("race scenery references", () => {
  it("pairs every point in each expanded race with an existing image and the reviewed map location", () => {
    for (const race of races) {
      const atmosphere = getRaceAtmosphere(race.slug, raceCourseMeta[race.slug]?.courseYear);
      expect(atmosphere, `${race.slug}: missing scenery`).toBeDefined();
      expect(raceEditorial[race.slug], `${race.slug}: missing preparation`).toBeDefined();
    }
    for (const [raceSlug, atmosphere] of Object.entries(additionalAtmospheres)) {
      const entry = raceEditorial[raceSlug]!;
      expect(getRaceAtmosphere(raceSlug, raceCourseMeta[raceSlug]?.courseYear)).toBeDefined();
      expect(getRaceAtmosphere(raceSlug, (atmosphere.courseYear ?? 2026) + 1)).toBeUndefined();
      const profile: RaceElevation = JSON.parse(readFileSync(`public/race-elevation/${raceSlug}.json`, "utf8"));
      for (const point of entry.points) {
        const scene = atmosphere.scenes.find((scene) => scene.id === point.sceneId);
        expect(scene, `${raceSlug}: ${point.heading}`).toBeDefined();
        expect(readFileSync(`public${scene!.imageSrc}`).byteLength).toBeGreaterThan(0);
      }
      for (const scene of atmosphere.scenes) {
        const point = scene.coursePoint;
        const position = elevationPointAtDistance(profile.points, point.distanceM)!;
        expect(position.lat).toBeCloseTo(point.lat, 6);
        expect(position.lng).toBeCloseTo(point.lng, 6);
        const reference = new URL(scene.referenceUrl);
        expect(reference.hostname).toBe("www.google.com");
        expect(reference.searchParams.get("pano") || reference.pathname.match(/!1s([^!]+)!2e10/)?.[1]).toBeTruthy();
      }
      const html = renderToStaticMarkup(
        createElement(RaceCoursePoints, { entry, atmosphere, onSelectPoint: () => {} }),
      );
      expect(html.match(/<figure/g)).toHaveLength(entry.points.length);
      expect(html.match(/>実際の景色を見る</g)).toHaveLength(entry.points.length);
      expect(html.match(/stroke-dasharray="2 8"/g) ?? []).toHaveLength(entry.points.length - 1);
    }
  });

  it("only enables the reviewed race edition", () => {
    expect(getRaceAtmosphere(slug, 2026)).toBeDefined();
    expect(getRaceAtmosphere(slug, 2027)).toBeUndefined();
    expect(getRaceAtmosphere(slug, undefined)).toBeUndefined();
    expect(getRaceAtmosphere("not-a-race", 2026)).toBeUndefined();
    expect(getRaceAtmosphere("not-a-race", undefined)).toBeUndefined();
    // Undated reference geometry must not acquire an invented race year.
    const undated = getRaceAtmosphere("naha-marathon", undefined);
    expect(undated?.courseYear).toBeNull();
    expect(getRaceAtmosphere("naha-marathon", 2026)).toBeUndefined();
    const html = renderToStaticMarkup(
      createElement(RaceCoursePoints, {
        entry: raceEditorial["naha-marathon"],
        atmosphere: undated,
        onSelectPoint: () => {},
      }),
    );
    expect(html).toContain("画像は掲載コースの景色。");
  });

  it("pins the correct leg on the same distance axis used by the map", () => {
    const profile: RaceElevation = JSON.parse(readFileSync(`public/race-elevation/${slug}.json`, "utf8"));
    const scenes = getRaceAtmosphere(slug, 2026)!.scenes;
    for (const scene of scenes) {
      if (!scene.coursePoint) continue;
      const { distanceM, lat, lng } = scene.coursePoint;
      const position = elevationPointAtDistance(profile.points, distanceM)!;
      expect(position.lat).toBeCloseTo(lat, 6);
      expect(position.lng).toBeCloseTo(lng, 6);
    }
    // The same streets occur twice: preserve outbound east / south, then return south.
    for (const [id, axis, direction] of [
      ["legacy-tokyo-dome-city", "lng", 1],
      ["legacy-nihonbashi", "lat", -1],
      ["legacy-hitotsubashi-turnaround", "lat", -1],
      ["legacy-iidabashi-climb", "lat", -1],
      ["legacy-stadium-return", "lat", -1],
    ] as const) {
      const point = scenes.find((scene) => scene.id === id)!.coursePoint!;
      const ahead = elevationPointAtDistance(profile.points, point.distanceM + 30)!;
      expect((ahead[axis] - point[axis]) * direction).toBeGreaterThan(0);
    }
  });

  it("labels generated imagery and keeps the off-course venue exterior out of distance claims", () => {
    const html = renderToStaticMarkup(
      createElement(RaceCoursePoints, {
        entry: raceEditorial[slug],
        atmosphere: getRaceAtmosphere(slug, 2026)!,
        onSelectPoint: () => {},
      }),
    );
    expect(html.match(/<figure/g)).toHaveLength(6);
    expect(html).not.toContain("AI生成の参考イメージ</p>");
    expect(html).toContain("現地の写真を参考にしたAI生成イメージです。");
    expect(html.match(/コース上で見る/g)).toHaveLength(5);
    expect(html.match(/>実際の景色を見る</g)).toHaveLength(6);
    expect(html).not.toContain("Googleマップで実景を見る");
    expect(html).toContain("6〜9");
    expect(html).toContain("9〜12");
    expect(html).toContain("18〜21.1");
    expect(html).toContain("北側から見た会場の外観");
    expect(html).toContain("公式の距離表示とは異なる");
    expect(html).toContain("2025年大会の実走記3件と公式コースを参考");
    expect(html).toContain("画像は2026年コースの景色");
    expect(html.match(/<h2\b/g)).toHaveLength(1);
    expect(html).not.toContain("コースの雰囲気");
    const items = html.split("<ol")[1].split("</ol>")[0].split("<li").slice(1);
    expect(items).toHaveLength(8);
    expect(items.filter((item) => item.includes("<img"))).toHaveLength(6);
    expect(items.at(-1)).not.toContain("km付近");
    for (const point of raceEditorial[slug]!.points) {
      if (!point.sceneId) continue;
      const scene = getRaceAtmosphere(slug, 2026)!.scenes.find((scene) => scene.id === point.sceneId);
      expect(scene).toBeDefined();
      expect(readFileSync(`public${scene!.imageSrc}`).byteLength).toBeGreaterThan(0);
    }
    const headings = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((match) => match[1]);
    expect(headings).toEqual([
      ...raceEditorial[slug]!.points.map((point) => point.heading),
      "スタートとフィニッシュは国立競技場",
    ]);
  });
});
