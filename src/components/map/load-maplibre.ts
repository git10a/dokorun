// maplibre-gl はuseEffectの中でしか使わないが、import()のままだとTurbopackがSSR用にも
// 1MB(gzip約270KiB)のチャンクを作り、OpenNextがそれをWorkerへ同梱してしまう。
// typeof window はビルド時に定数へ置き換わるため、サーバー側ではimport()ごと消える。
export function loadMaplibre(): Promise<typeof import("maplibre-gl")> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("maplibre-gl is browser-only"));
  }
  return import("maplibre-gl");
}
