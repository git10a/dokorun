// Intl.DateTimeFormatの生成は1回あたり約0.07msと高価で、草カレンダーは1レンダーで
// 500回以上呼ぶ(Workers無料プランのCPU 10ms上限を生成コストだけで超える)。必ず使い回す。
const jstDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" });
const jstYearFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" });

export function jstDateString(date = new Date()) {
  return jstDateFormat.format(date);
}

export function jstDayFromOffset(offsetDays: 0 | -1) {
  const now = new Date();
  return jstDateString(new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000));
}

export function jstYear(date = new Date()) {
  return Number(jstYearFormat.format(date));
}
