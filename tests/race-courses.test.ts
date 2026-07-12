import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import raceCourses from "../src/lib/race-courses.json";
import { races, racesByCalendar } from "../src/lib/races";

type CourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const courses = raceCourses as Record<string, CourseMeta | undefined>;

describe("大会コース", () => {
  it("全大会に2026年の具体的な開催日があり、一覧は開催日順になる", () => {
    for (const race of races) {
      expect(race.timing, race.name).toMatch(/^2026年\d{1,2}月\d{1,2}日（日）$/);
    }

    expect(racesByCalendar.map((race) => race.slug)).toEqual([
      "ehime-marathon",
      "beppu-oita-marathon",
      "saitama-marathon",
      "kyoto-marathon",
      "osaka-marathon",
      "tokyo-marathon",
      "nagoya-womens-marathon",
      "itabashi-city-marathon",
      "hokkaido-marathon",
      "tazawako-marathon",
      "yokohama-marathon",
      "mito-komon-marathon",
      "kanazawa-marathon",
      "suwako-marathon",
      "shimonoseki-kaikyo-marathon",
      "fukuoka-marathon",
      "ibigawa-marathon",
      "kobe-marathon",
      "naha-marathon",
      "fujisan-marathon",
      "aoshima-taiheiyo-marathon",
    ]);
  });

  it("掲載する全大会にGPX由来のコースデータがある", () => {
    for (const race of races) {
      expect(race.officialUrl, `${race.name} の公式URL`).toMatch(/^https:\/\//);
      expect(courses[race.slug], `${race.name} のマニフェスト`).toBeDefined();
      expect(existsSync(join(process.cwd(), "data", "race-gpx", `${race.slug}.gpx`)), `${race.name} のGPX原本`).toBe(true);
      expect(existsSync(join(process.cwd(), "public", "race-gpx", `${race.slug}.gpx`)), `${race.name} の公開GPX`).toBe(true);
      expect(existsSync(join(process.cwd(), "public", "race-courses", `${race.slug}.json`)), `${race.name} の公開コース`).toBe(true);
    }
    expect(Object.keys(courses)).toHaveLength(races.length);
  });

  it("全大会コースが公式距離の±3%以内に収まる", () => {
    for (const race of races) {
      const officialDistanceM = race.distanceLabel.includes("フル") ? 42195 : 21097.5;
      const differenceRate = Math.abs((courses[race.slug]?.distanceM ?? 0) - officialDistanceM) / officialDistanceM;
      expect(differenceRate, `${race.name}: ${courses[race.slug]?.distanceM}m`).toBeLessThanOrEqual(0.03);
    }
  });
});
