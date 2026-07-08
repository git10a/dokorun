export function jstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date);
}

export function jstDayFromOffset(offsetDays: 0 | -1) {
  const now = new Date();
  return jstDateString(new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000));
}

export function jstYear(date = new Date()) {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric" }).format(date));
}
