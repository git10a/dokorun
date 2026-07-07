import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { isNotNull, eq, and } from "drizzle-orm";
import puppeteer, { type Browser } from "puppeteer-core";
import { getDb } from "../src/db";
import { courses, spots } from "../src/db/schema";
import type { LineString } from "../src/lib/types";

config({ path: ".env.local" });
config();

// 使い方: npx tsx scripts/generate-course-maps.ts [slug...]
// 公開スポットの代表コースを OpenFreeMap(liberty) + MapLibre で描画し、
// スポットカード用のサムネイル画像を public/course-maps/<slug>.webp に生成する。
// 引数に slug を渡すとそのスポットだけ再生成する(省略時は geojson を持つ全公開スポット)。
// gpx:apply でコースを更新したら、対象 slug を指定して再実行すること。
// 実行にはローカルの Google Chrome が必要(puppeteer-core で起動する)。

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = join(process.cwd(), "public", "course-maps");
// カードは 128×168(モバイル)/ 224×176(sm以上)で object-cover 表示される。
// 正方形で書き出し、どちらの比率でクロップされてもルートが残るよう余白を広めに取る。
const SIZE = 512;
const PADDING = 96;

const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body,#map{margin:0;width:${SIZE}px;height:${SIZE}px}
</style></head><body><div id="map"></div></body></html>`;

async function renderAll(browser: Browser, targets: { slug: string; geojson: LineString }[]) {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: 1 });
  await page.setContent(PAGE_HTML);
  await page.addStyleTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.css") });
  await page.addScriptTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.js") });

  await page.evaluate(() => {
    const maplibregl = (window as never as { maplibregl: typeof import("maplibre-gl") }).maplibregl;
    const map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [139.7671, 35.6812],
      zoom: 12,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    const w = window as never as { map: typeof map; mapReady: Promise<void> };
    w.map = map;
    w.mapReady = new Promise((resolve) => map.on("load", () => resolve()));
  });
  await page.evaluate(() => (window as never as { mapReady: Promise<void> }).mapReady);

  for (const { slug, geojson } of targets) {
    await page.evaluate(({ data, padding }: { data: LineString; padding: number }) => {
      const w = window as never as { map: import("maplibre-gl").Map; maplibregl: typeof import("maplibre-gl") };
      const map = w.map;
      if (map.getLayer("course")) map.removeLayer("course");
      if (map.getSource("course")) map.removeSource("course");
      map.addSource("course", { type: "geojson", data });
      map.addLayer({ id: "course", type: "line", source: "course", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1A1A1A", "line-width": 4, "line-opacity": 0.85 } });
      const bounds = new w.maplibregl.LngLatBounds();
      data.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      // fitBoundsはアニメーション経由で初回にズレることがあるため、カメラを直接確定させる
      const camera = map.cameraForBounds(bounds, { padding, maxZoom: 16 });
      if (camera) map.jumpTo(camera);
    }, { data: geojson, padding: PADDING });
    // タイル・グリフの取得と描画が落ち着くまで待つ
    await page.evaluate(() => new Promise<void>((resolve) => {
      const map = (window as never as { map: import("maplibre-gl").Map }).map;
      if (map.loaded() && map.areTilesLoaded()) { resolve(); return; }
      map.once("idle", () => resolve());
    }));
    const path = join(OUT_DIR, `${slug}.webp`) as `${string}.webp`;
    await page.screenshot({ path, type: "webp", quality: 82 });
    console.log(`generated ${slug}.webp`);
  }
  await page.close();
}

async function main() {
  const onlySlugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const db = getDb();
  const rows = await db
    .select({ slug: spots.slug, geojson: courses.geojson })
    .from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), isNotNull(courses.geojson)))
    .orderBy(spots.slug);
  const targets = rows
    .filter((row): row is { slug: string; geojson: LineString } => Boolean(row.geojson?.coordinates?.length))
    .filter((row) => !onlySlugs.length || onlySlugs.includes(row.slug));
  if (!targets.length) {
    console.error("対象スポットがありません");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  // 生成漏れ確認用にマニフェストも書き出す
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    await renderAll(browser, targets);
  } finally {
    await browser.close();
  }
  if (!onlySlugs.length) {
    writeFileSync(join(OUT_DIR, "manifest.json"), `${JSON.stringify(targets.map((t) => t.slug), null, 2)}\n`);
  }
  console.log(`done: ${targets.length}件`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
