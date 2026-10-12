import { jstTodayKey, raceDateKey, raceShortDate } from "./race-date";
import { racesByCalendar, type RaceDef } from "./races";

export { raceDateKey };

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

// 大会名の検索ボックス用の候補。開催前→開催済みの順
export function raceSearchOptions(todayKey = jstTodayKey()) {
  const { upcoming, finished } = splitRacesBySchedule(todayKey);
  return [...upcoming, ...finished].map((race) => ({ slug: race.slug, name: race.name, prefecture: race.prefecture, date: raceShortDate(race) }));
}
