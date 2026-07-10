import { readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 1200;
const HEIGHT = 630;

const assetDataUri = (path: string, mime: string) =>
  `data:${mime};base64,${readFileSync(join(process.cwd(), path)).toString("base64")}`;

const maps = [
  { src: assetDataUri("public/course-maps/kokyo.webp", "image/webp"), name: "皇居", meta: "5.0km / 信号ゼロ" },
  { src: assetDataUri("public/course-maps/komazawa.webp", "image/webp"), name: "駒沢オリンピック公園", meta: "2.1km / 周回" },
  { src: assetDataUri("public/course-maps/toyosu-gururi-park.webp", "image/webp"), name: "豊洲ぐるり公園", meta: "4.8km / 水辺" },
];

const ran = assetDataUri("public/characters/ran-happy.png", "image/png");
const hashiro = assetDataUri("public/characters/hashiro-smile.png", "image/png");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;800;900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;font-family:"Noto Sans JP","Hiragino Sans",sans-serif;color:#1a1a1a}
  body{position:relative;background:#ffd900}
  .screen{position:absolute;inset:0;padding:58px 70px}
  .brand{display:inline-flex;align-items:center;gap:14px;border:4px solid #1a1a1a;border-radius:999px;background:#fff;padding:12px 24px;font-size:32px;font-weight:900;box-shadow:8px 8px 0 #1a1a1a}
  .mark{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#ffd900;font-size:26px}
  h1{margin:58px 0 0;font-size:78px;line-height:1.08;font-weight:900;letter-spacing:0}
  .lead{width:620px;margin:24px 0 0;font-size:29px;line-height:1.48;font-weight:800}
  .chips{position:absolute;left:70px;bottom:74px;display:flex;gap:14px}
  .chip{border:3px solid #1a1a1a;border-radius:999px;background:#fff;padding:9px 17px;font-size:23px;font-weight:900}
  .url{position:absolute;left:76px;bottom:30px;font-size:24px;font-weight:900}
  .maps{position:absolute;right:42px;top:42px;width:432px;height:520px}
  .map-card{position:absolute;z-index:2;width:312px;border:5px solid #1a1a1a;border-radius:18px;background:#fff;box-shadow:12px 12px 0 rgba(26,26,26,.95);overflow:hidden}
  .map-card:nth-child(1){right:64px;top:0;transform:rotate(4deg)}
  .map-card:nth-child(2){right:26px;top:190px;transform:rotate(-5deg)}
  .map-card:nth-child(3){right:78px;top:380px;transform:rotate(3deg)}
  .map-card img{display:block;width:100%;height:110px;object-fit:cover}
  .map-text{padding:10px 15px 12px}
  .map-name{font-size:22px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .map-meta{margin-top:3px;font-size:16px;font-weight:800;color:#6b7280}
  .ran{position:absolute;z-index:1;right:350px;bottom:2px;width:105px;filter:drop-shadow(4px 6px 0 rgba(26,26,26,.16))}
  .hashiro{position:absolute;z-index:1;right:24px;bottom:2px;width:108px;filter:drop-shadow(4px 6px 0 rgba(26,26,26,.16))}
  .corner{position:absolute;right:0;bottom:0;width:310px;height:108px;background:#f7f5ef;border-top:5px solid #1a1a1a;border-left:5px solid #1a1a1a;border-top-left-radius:30px}
</style></head><body>
  <div class="corner"></div>
  <div class="screen">
    <div class="brand"><span class="mark">走</span><span>どこラン</span></div>
    <h1>次はどこで<br>ランする？</h1>
    <p class="lead">距離・信号・路面・設備で、<br>日本全国のランニングスポットを探せる。</p>
    <div class="chips"><span class="chip">信号ゼロ</span><span class="chip">周回コース</span><span class="chip">シャワー</span></div>
    <div class="url">dokorun.com</div>
  </div>
  <div class="maps">
    ${maps.map((map) => `<div class="map-card"><img src="${map.src}" alt=""><div class="map-text"><div class="map-name">${map.name}</div><div class="map-meta">${map.meta}</div></div></div>`).join("")}
  </div>
  <img class="ran" src="${ran}" alt="">
  <img class="hashiro" src="${hashiro}" alt="">
</body></html>`;

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.screenshot({ path: join(process.cwd(), "public", "og.png"), type: "png" });
    await page.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
