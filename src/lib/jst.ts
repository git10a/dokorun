// Intl.DateTimeFormatの生成は1回あたり約0.07msと高価(Workers無料プランはCPU 10ms上限)。必ず使い回す。
const jstYearFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" });
const jstMonthFormat = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", month: "numeric" });

export function jstYear(date = new Date()) {
  return Number(jstYearFormat.format(date));
}

export function jstMonth(date = new Date()) {
  return Number(jstMonthFormat.format(date));
}
