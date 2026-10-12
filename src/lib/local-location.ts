// Exact coordinates stay in this tab; never include them in a request or URL.
const KEY = "dokorun:near-location";
const TTL = 5 * 60 * 1000;
export type LocalLocation = { lat: number; lng: number };
export function saveLocalLocation(location: LocalLocation) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...location, expires: Date.now() + TTL }));
  } catch {
    /* optional browser storage */
  }
  window.dispatchEvent(new CustomEvent("dokorun-location", { detail: location }));
}
export function readLocalLocation(): LocalLocation | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (
      value &&
      value.expires > Date.now() &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180
    )
      return { lat: value.lat, lng: value.lng };
    sessionStorage.removeItem(KEY);
  } catch {
    /* absent/expired storage */
  }
  return null;
}
