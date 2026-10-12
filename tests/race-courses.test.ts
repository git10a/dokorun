import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import raceCourses from "../src/lib/race-courses.json";
import { races, racesByCalendar } from "../src/lib/races";

type CourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const courses = raceCourses as Record<string, CourseMeta | undefined>;

describe("大会コース", () => {
  it("全大会に有効な開催日・曜日があり、年をまたいで開催日順になる", () => {
    const dates = new Map<string, number>();
    for (const race of races) {
      const match = race.timing.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日（([日月火水木金土])）$/);
      expect(match, race.name).not.toBeNull();
      const [, year, month, day, weekday] = match!;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      expect(date.getUTCFullYear(), race.name).toBe(Number(year));
      expect(date.getUTCMonth() + 1, race.name).toBe(Number(month));
      expect(date.getUTCDate(), race.name).toBe(Number(day));
      expect("日月火水木金土"[date.getUTCDay()], race.name).toBe(weekday);
      dates.set(race.slug, date.getTime());
    }
    expect(new Set(racesByCalendar.map((race) => race.slug))).toEqual(new Set(races.map((race) => race.slug)));
    const ordered = racesByCalendar.map((race) => dates.get(race.slug)!);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    expect(racesByCalendar.findIndex((race) => race.slug === "aoshima-taiheiyo-marathon"))
      .toBeLessThan(racesByCalendar.findIndex((race) => race.slug === "ehime-marathon"));
  });

  it("掲載する全大会にGPX由来のコースデータがある", () => {
    for (const race of races) {
      expect(race.officialUrl, `${race.name} の公式URL`).toMatch(/^https:\/\//);
      expect(courses[race.slug], `${race.name} のマニフェスト`).toBeDefined();
      expect(existsSync(join(process.cwd(), "data", "race-gpx", `${race.slug}.gpx`)), `${race.name} のGPX原本`).toBe(true);
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
