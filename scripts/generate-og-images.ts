import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { isNotNull, eq, and } from "drizzle-orm";
import puppeteer, { type Browser } from "puppeteer-core";
import { getDb } from "../src/db";
import { courses, spots } from "../src/db/schema";
import { courseTypeLabels, type CourseType, type LineString } from "../src/lib/types";

config({ path: ".env.local" });
config();

// 使い方: npx tsx scripts/generate-og-images.ts [slug...]
// 公開スポットの代表コースを地図に描き、スポット名・距離・キャラクターを重ねた
// OGP画像(1200x630)を public/og/spots/<slug>.jpg に生成する。
// 引数に slug を渡すとそのスポットだけ再生成する(省略時は geojson を持つ全公開スポット)。
// gpx:apply やスポット名変更のあとは、対象 slug を指定して再実行すること。
// 本番と同じ内容にするため、本番D1のスナップショットで実行するのが基本:
//   node scripts/d1-snapshot.mjs .d1-build/prod.sqlite
//   D1_LOCAL_PATH=.d1-build/prod.sqlite npx tsx scripts/generate-og-images.ts
// 実行にはローカルの Google Chrome が必要(puppeteer-core で起動する)。

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = join(process.cwd(), "public", "og", "spots");
const WIDTH = 1200;
const HEIGHT = 630;
// 下部の情報バーに隠れないよう、コースのフィット範囲は下方向に余白を広く取る
const FIT_PADDING = { top: 90, left: 90, right: 90, bottom: 260 };

type Target = {
  slug: string;
  name: string;
  prefecture: string;
  city: string;
  distanceM: number;
  courseType: CourseType;
  geojson: LineString;
};

function characterFor(slug: string) {
  // スポットごとに固定でハシロー/ランを出し分ける(生成のたびに変わらないようハッシュで決める)
  const sum = [...slug].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return sum % 2 === 0 ? "hashiro-smile.png" : "ran-smile.png";
}

function distanceLabel(distanceM: number) {
  return (distanceM / 1000).toFixed(distanceM % 1000 ? 1 : 0);
}

const characterDataUri = (file: string) =>
  `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "characters", file)).toString("base64")}`;

const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;font-family:"Noto Sans JP","Hiragino Sans",sans-serif}
  #map{position:absolute;inset:0}
  #logo{position:absolute;top:28px;left:32px;background:#ffd900;color:#1a1a1a;font-weight:900;font-size:30px;padding:10px 24px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.18)}
  #bar{position:absolute;left:0;right:0;bottom:0;background:#f7f5ef;border-top:4px solid #ffd900;padding:26px 40px 30px;display:flex;align-items:center;gap:32px}
  #text{flex:1;min-width:0}
  #name{font-size:58px;font-weight:900;color:#1a1a1a;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #meta{margin-top:10px;font-size:28px;font-weight:700;color:#6b7280}
  #dist{flex-shrink:0;background:#ffd900;border-radius:20px;padding:14px 28px;text-align:center}
  #dist .v{font-size:56px;font-weight:900;color:#1a1a1a;line-height:1}
  #dist .u{font-size:24px;font-weight:700;color:#1a1a1a;margin-left:4px}
  #chara{position:absolute;right:34px;bottom:172px;height:170px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.2))}
</style></head><body>
<div id="map"></div>
<div id="logo">どこラン</div>
<img id="chara" src="" alt="">
<div id="bar">
  <div id="text"><div id="name"></div><div id="meta"></div></div>
  <div id="dist"><span class="v"></span><span class="u">km</span></div>
</div>
</body></html>`;

async function renderAll(browser: Browser, targets: Target[]) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  // フォントは後段の document.fonts.ready で読み込み完了を待つ
  await page.setContent(PAGE_HTML, { waitUntil: "load" });
  await page.addStyleTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.css") });
  await page.addScriptTag({ path: join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl.js") });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

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

  for (const target of targets) {
    await page.evaluate(
      ({ data, padding, name, meta, dist, chara }: { data: LineString; padding: typeof FIT_PADDING; name: string; meta: string; dist: string; chara: string }) => {
        const nameEl = document.getElementById("name")!;
        nameEl.textContent = name;
        // 長い名前は省略記号で切らず、フォントを段階的に縮めて収める
        nameEl.style.fontSize = name.length > 18 ? "38px" : name.length > 13 ? "46px" : "58px";
        document.getElementById("meta")!.textContent = meta;
        document.querySelector("#dist .v")!.textContent = dist;
        (document.getElementById("chara") as HTMLImageElement).src = chara;
        const w = window as never as { map: import("maplibre-gl").Map; maplibregl: typeof import("maplibre-gl") };
        const map = w.map;
        if (map.getLayer("course")) map.removeLayer("course");
        if (map.getSource("course")) map.removeSource("course");
        map.addSource("course", { type: "geojson", data });
        map.addLayer({ id: "course", type: "line", source: "course", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1A1A1A", "line-width": 6, "line-opacity": 0.85 } });
        const bounds = new w.maplibregl.LngLatBounds();
        data.coordinates.forEach((coordinate) => bounds.extend(coordinate));
        // fitBoundsはアニメーション経由で初回にズレることがあるため、カメラを直接確定させる
        const camera = map.cameraForBounds(bounds, { padding, maxZoom: 15.5 });
        if (camera) map.jumpTo(camera);
      },
      {
        data: target.geojson,
        padding: FIT_PADDING,
        name: target.name,
        meta: `${target.prefecture} ${target.city}・${courseTypeLabels[target.courseType]}コース`,
        dist: distanceLabel(target.distanceM),
        chara: characterDataUri(characterFor(target.slug)),
      },
    );
    // タイル・グリフの取得と描画が落ち着くまで待つ
    await page.evaluate(() => new Promise<void>((resolve) => {
      const map = (window as never as { map: import("maplibre-gl").Map }).map;
      if (map.loaded() && map.areTilesLoaded()) { resolve(); return; }
      map.once("idle", () => resolve());
    }));
    const path = join(OUT_DIR, `${target.slug}.jpg`) as `${string}.jpg`;
    await page.screenshot({ path, type: "jpeg", quality: 85 });
    console.log(`generated ${target.slug}.jpg`);
  }
  await page.close();
}

async function main() {
  const onlySlugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const db = getDb();
  const rows = await db
    .select({
      slug: spots.slug,
      name: spots.name,
      prefecture: spots.prefecture,
      city: spots.city,
      distanceM: courses.distanceM,
      courseType: courses.courseType,
      geojson: courses.geojson,
    })
    .from(spots)
    .innerJoin(courses, and(eq(courses.spotId, spots.id), eq(courses.isPrimary, true)))
    .where(and(eq(spots.isPublished, true), isNotNull(courses.geojson)))
    .orderBy(spots.slug);
  const targets = rows
    .filter((row): row is Target => Boolean(row.geojson?.coordinates?.length))
    .filter((row) => !onlySlugs.length || onlySlugs.includes(row.slug));
  if (!targets.length) {
    console.error("対象スポットがありません");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    await renderAll(browser, targets);
  } finally {
    await browser.close();
  }
  console.log(`done: ${targets.length}件`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
