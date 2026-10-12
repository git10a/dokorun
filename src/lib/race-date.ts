// クライアントからも使う日付計算。大会データ(races.ts)を読み込まないよう分けている
export function jstTodayKey(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function daysUntil(dateKey: string, todayKey: string) {
  return Math.round((Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
}
