import { join } from "node:path";
import puppeteer, { type Page } from "puppeteer-core";

// puppeteer + MapLibre で地図画像を書き出すスクリプト(OGP・コース地図・大会サムネイル)の共通部分

export const CHROME_PATH = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function launchBrowser() {
  return puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
}

// html を読み込み、#map に OpenFreeMap のスタイルで地図を作って load まで待つ。
// 作った地図はページ内の window.map から参照できる
export async function setupMapPage(
  page: Page,
  {
    html,
    style,
    zoom,
    waitForFonts = false,
  }: { html: string; style: "liberty" | "positron"; zoom: number; waitForFonts?: boolean },
) {
  await page.setContent(html, { waitUntil: "load" });
  // tsx(esbuild)はevaluate内の名前付き関数に__nameヘルパーを差し込むため、ブラウザ側にも用意する
  await page.addScriptTag({ content: "window.__name = (fn) => fn;" });
  await page.addStyleTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.css") });
  await page.addScriptTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.js") });
  if (waitForFonts) await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(
    ({ styleUrl, zoom }: { styleUrl: string; zoom: number }) => {
      const maplibregl = (window as never as { maplibregl: typeof import("maplibre-gl") }).maplibregl;
      const map = new maplibregl.Map({
        container: "map",
        style: styleUrl,
        center: [139.7671, 35.6812],
        zoom,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
      });
      const w = window as never as { map: typeof map; mapReady: Promise<void> };
      w.map = map;
      w.mapReady = new Promise((resolve) => map.on("load", () => resolve()));
    },
    { styleUrl: `https://tiles.openfreemap.org/styles/${style}`, zoom },
  );
  await page.evaluate(() => (window as never as { mapReady: Promise<void> }).mapReady);
}

// タイル・グリフの取得と描画が落ち着くまで待つ
export function waitForMapIdle(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const map = (window as never as { map: import("maplibre-gl").Map }).map;
        if (map.loaded() && map.areTilesLoaded()) {
          resolve();
          return;
        }
        map.once("idle", () => resolve());
      }),
  );
}
