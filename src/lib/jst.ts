// Intl.DateTimeFormatの生成は1回あたり約0.07msと高価(Workers無料プランはCPU 10ms上限)。必ず使い回す。
const jstYearFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" });
const jstMonthFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", month: "numeric" });
const jstDatePartsFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
const oneDayMs = 24 * 60 * 60 * 1000;
const jstOffsetMs = 9 * 60 * 60 * 1000;

export function jstYear(date = new Date()) {
  return Number(jstYearFormat.format(date));
}

export function jstMonth(date = new Date()) {
  return Number(jstMonthFormat.format(date));
}

export function jstDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + jstOffsetMs);
  const start = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - jstOffsetMs);
  return { start, end: new Date(start.getTime() + oneDayMs) };
}

export function jstNoon(now = new Date()) {
  return new Date(jstDayBounds(now).start.getTime() + 12 * 60 * 60 * 1000);
}

export function jstDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(jstDatePartsFormat.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
