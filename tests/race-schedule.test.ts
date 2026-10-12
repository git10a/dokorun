import { describe, expect, it } from "vitest";
import { jstDateKey } from "@/lib/jst";
import { daysUntil, raceDateKey, raceShortDate } from "@/lib/race-date";
import { raceSearchOptions, splitRacesBySchedule } from "@/lib/race-schedule";
import { races, racesByCalendar } from "@/lib/races";

describe("race dates", () => {
  it("reads the date key and short labels from timing", () => {
    const race = { timing: "2027年3月7日（日）" };
    expect(raceDateKey(race)).toBe("2027-03-07");
    expect(raceShortDate(race)).toBe("3/7（日）");
    expect(raceShortDate(race, false)).toBe("3/7");
    expect(raceDateKey({ timing: "未定" })).toBeNull();
  });

  it("uses the JST calendar day around midnight", () => {
    expect(jstDateKey(new Date("2026-10-12T14:59:59Z"))).toBe("2026-10-12");
    expect(jstDateKey(new Date("2026-10-12T15:00:00Z"))).toBe("2026-10-13");
    expect(jstDateKey("not a date")).toBe("");
    expect(daysUntil("2026-10-20", "2026-10-12")).toBe(8);
  });

  it("every listed race has a parseable date, and the calendar is in date order", () => {
    for (const race of races) expect(raceDateKey(race), race.slug).not.toBeNull();
    const keys = racesByCalendar.map((race) => raceDateKey(race)!);
    expect(keys).toEqual([...keys].sort());
  });

  it("splits upcoming (including today) from finished races", () => {
    const todayKey = raceDateKey(racesByCalendar[Math.floor(racesByCalendar.length / 2)])!;
    const { upcoming, finished } = splitRacesBySchedule(todayKey);
    expect(upcoming.length + finished.length).toBe(races.length);
    expect(upcoming.every((race) => raceDateKey(race)! >= todayKey)).toBe(true);
    expect(finished.every((race) => raceDateKey(race)! < todayKey)).toBe(true);
    expect(raceSearchOptions(todayKey).map((option) => option.slug)).toEqual(
      [...upcoming, ...finished].map((race) => race.slug),
    );
  });
});
