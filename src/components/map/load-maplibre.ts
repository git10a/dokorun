// Map rendering only runs in the browser. Keep its dynamic import out of the server build.
export function loadMapLibre() {
  if (typeof window === "undefined") throw new Error("MapLibre requires a browser");
  return import("maplibre-gl");
}
