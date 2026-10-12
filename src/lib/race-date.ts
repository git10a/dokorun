import { jstDateKey } from "./jst";

// クライアントからも使う大会の日付計算。大会データ(races.ts)を読み込まないよう分けている

export function jstTodayKey(now = new Date()) {
  return jstDateKey(now);
}

// timing("2026年10月25日（日）")をJSTの日付キー"2026-10-25"にする
export function raceDateKey(race: { timing: string }) {
  const match = race.timing.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

// 一覧向けの短い日付。"2026年10月25日（日）" → "10/25（日）"(withWeekday=false なら "10/25")
export function raceShortDate(race: { timing: string }, withWeekday = true) {
  return race.timing.replace(withWeekday ? /^\d{4}年(\d+)月(\d+)日/ : /^\d{4}年(\d+)月(\d+)日.*/, "$1/$2");
}

export function daysUntil(dateKey: string, todayKey: string) {
  return Math.round((Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
}
