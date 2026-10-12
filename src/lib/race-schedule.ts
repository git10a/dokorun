import { jstTodayKey } from "./race-date";
import { racesByCalendar, type RaceDef } from "./races";

// timing("2026年10月25日（日）")をJSTの日付キー"2026-10-25"にする
export function raceDateKey(race: RaceDef) {
  const match = race.timing.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

// 掲載日程は当年分のみ。開催前(当日含む)を日付順に、開催済みは次回に向けて後ろへ回す
export function splitRacesBySchedule(todayKey = jstTodayKey()) {
  const upcoming: RaceDef[] = [];
  const finished: RaceDef[] = [];
  for (const race of racesByCalendar) {
    const key = raceDateKey(race);
    (key && key >= todayKey ? upcoming : finished).push(race);
  }
  return { upcoming, finished };
}
