export const PB_EVENTS = [
  { key: "1500m", label: "1500m", meters: 1500, minS: 120, maxS: 1800 },
  { key: "3000m", label: "3000m", meters: 3000, minS: 240, maxS: 3600 },
  { key: "5k", label: "5km", meters: 5000, minS: 600, maxS: 7200 },
  { key: "10k", label: "10km", meters: 10000, minS: 1200, maxS: 14400 },
  { key: "half", label: "ハーフマラソン", meters: 21097.5, minS: 3600, maxS: 28800 },
  { key: "30k", label: "30km", meters: 30000, minS: 5400, maxS: 43200 },
  { key: "full", label: "フルマラソン", meters: 42195, minS: 7200, maxS: 72000 },
  { key: "100k", label: "100km（ウルトラ）", meters: 100000, minS: 21600, maxS: 172800 },
] as const;

export type PbEventKey = (typeof PB_EVENTS)[number]["key"];

export function isPbEventKey(value: string): value is PbEventKey {
  return PB_EVENTS.some((event) => event.key === value);
}

export function secondsFromParts(hours: number, minutes: number, seconds: number) {
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPace(totalSeconds: number, meters: number) {
  return `${formatDuration(Math.round(totalSeconds / (meters / 1000)))}/km`;
}

export function validatePbTime(eventKey: string, timeS: number) {
  const event = PB_EVENTS.find((item) => item.key === eventKey);
  if (!event) return "種目を確認してください";
  if (!Number.isInteger(timeS) || timeS < event.minS || timeS > event.maxS) return `${event.label}のタイムを確認してください`;
  return null;
}
