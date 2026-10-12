import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { LineString } from "../src/lib/types";
import { launchBrowser, setupMapPage, waitForMapIdle } from "./lib/map-render";

// 使い方: npx tsx scripts/build-race-thumbnails.ts [slug...]
// public/race-courses/<slug>.json(大会の参考コース)を OpenFreeMap(positron) + MapLibre で描画し、
// トップ・大会一覧のカード用サムネイルを public/race-thumbs/<slug>.webp に生成する。
// 背景は情報量の少ない淡色地図にし、スタート(S)・ゴール(G)をマーカーで示す。
// 引数に slug を渡すとその大会だけ再生成する。race-gpx:apply でコースを更新したら再実行すること。
// 実行にはローカルの Google Chrome と地図タイルへのネットワーク接続が必要(puppeteer-core で起動する)。

const SOURCE_DIR = join(process.cwd(), "public", "race-courses");
const OUT_DIR = join(process.cwd(), "public", "race-thumbs");
// カードは16:10で、スマホでは幅160px前後まで縮む。地図を小さめのCSSサイズで描いて2倍密度で書き出し、
// 道路などの細部を減らしつつ、線とS/Gマーカーが縮小後も読める太さになるようにする(出力は800×500)
const WIDTH = 400;
const HEIGHT = 250;
const SCALE = 2;
const PADDING = 40;
// 発着がこの距離(m)以内なら周回コースとみなし「S/G」1つにまとめる
const SAME_POINT_M = 300;

const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body,#map{margin:0;width:${WIDTH}px;height:${HEIGHT}px}
  .pin{display:grid;place-items:center;height:34px;min-width:34px;padding:0 7px;box-sizing:border-box;border-radius:999px;border:3px solid #1a1a1a;font:900 17px/1 "Helvetica Neue",Arial,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.25)}
  .start{background:#ffd900;color:#1a1a1a}
  .goal{background:#1a1a1a;color:#fff}
</style></head><body><div id="map"></div></body></html>`;

function distanceM([lng1, lat1]: number[], [lng2, lat2]: number[]) {
  const rad = Math.PI / 180;
  const x = (lng2 - lng1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.hypot(x, y) * 6_371_000;
}

async function main() {
  const onlySlugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const targets = readdirSync(SOURCE_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      slug: file.replace(/\.json$/, ""),
      geojson: JSON.parse(readFileSync(join(SOURCE_DIR, file), "utf8")) as LineString,
    }))
    .filter(({ slug }) => !onlySlugs.length || onlySlugs.includes(slug));
  if (!targets.length) {
    console.error("対象の大会コースがありません");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE });
    await setupMapPage(page, { html: PAGE_HTML, style: "positron", zoom: 11 });
    await page.evaluate(() => {
      (window as never as { markers: unknown[] }).markers = [];
    });
    // positronは全体がグレーで味気ないため、文字ラベルを消して水・緑・陸に色を付ける
    await page.evaluate(() => {
      const map = (window as never as { map: import("maplibre-gl").Map }).map;
      for (const layer of map.getStyle().layers) {
        const id = layer.id;
        if (layer.type === "symbol") map.removeLayer(id);
        else if (layer.type === "background") map.setPaintProperty(id, "background-color", "#f7f5ef");
        else if (layer.type === "fill" && /water/.test(id)) map.setPaintProperty(id, "fill-color", "#b5dcf2");
        else if (layer.type === "line" && /water/.test(id)) map.setPaintProperty(id, "line-color", "#b5dcf2");
        else if (layer.type === "fill" && /park|wood|grass|landcover|forest/.test(id))
          map.setPaintProperty(id, "fill-color", "#d9ecc8");
      }
    });

    for (const { slug, geojson } of targets) {
      const coords = geojson.coordinates;
      const loop = distanceM(coords[0], coords[coords.length - 1]) <= SAME_POINT_M;
      await page.evaluate(
        ({ data, padding, loop }: { data: LineString; padding: number; loop: boolean }) => {
          const w = window as never as {
            map: import("maplibre-gl").Map;
            maplibregl: typeof import("maplibre-gl");
            markers: import("maplibre-gl").Marker[];
          };
          const map = w.map;
          for (const id of ["course", "course-casing"]) if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource("course")) map.removeSource("course");
          w.markers.forEach((marker) => marker.remove());
          map.addSource("course", { type: "geojson", data });
          const layout = { "line-cap": "round", "line-join": "round" } as const;
          map.addLayer({
            id: "course-casing",
            type: "line",
            source: "course",
            layout,
            paint: { "line-color": "#ffd900", "line-width": 10, "line-opacity": 0.9 },
          });
          map.addLayer({
            id: "course",
            type: "line",
            source: "course",
            layout,
            paint: { "line-color": "#1a1a1a", "line-width": 4 },
          });
          const pin = (label: string, className: string, lngLat: [number, number]) => {
            const element = document.createElement("div");
            element.className = `pin ${className}`;
            element.textContent = label;
            return new w.maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
          };
          const first = data.coordinates[0] as [number, number];
          const last = data.coordinates[data.coordinates.length - 1] as [number, number];
          // ゴールを先に置き、重なったときにスタートが上に来るようにする
          w.markers = loop ? [pin("S/G", "start", first)] : [pin("G", "goal", last), pin("S", "start", first)];
          const bounds = new w.maplibregl.LngLatBounds();
          data.coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
          // fitBoundsはアニメーション経由で初回にズレることがあるため、カメラを直接確定させる
          const camera = map.cameraForBounds(bounds, { padding, maxZoom: 15 });
          if (camera) map.jumpTo(camera);
        },
        { data: geojson, padding: PADDING, loop },
      );
      await waitForMapIdle(page);
      const path = join(OUT_DIR, `${slug}.webp`) as `${string}.webp`;
      await page.screenshot({ path, type: "webp", quality: 80 });
      console.log(`generated ${slug}.webp${loop ? " (S/G)" : ""}`);
    }
    await page.close();
  } finally {
    await browser.close();
  }
  // 旧形式(SVG)のサムネイルが残っていれば消す
  for (const file of readdirSync(OUT_DIR).filter((name) => name.endsWith(".svg"))) rmSync(join(OUT_DIR, file));
  console.log(`done: ${targets.length}件`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
