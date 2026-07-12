import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import raceCourses from "../src/lib/race-courses.json";
import { races } from "../src/lib/races";

type CourseMeta = { distanceM: number; elevationGainM: number | null; source: "gps" | "map" };
const courses = raceCourses as Record<string, CourseMeta | undefined>;

describe("大会コース", () => {
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
