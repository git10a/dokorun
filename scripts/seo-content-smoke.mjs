import assert from "node:assert/strict";

const version = process.argv[2];
const base = "https://dokorun.com";
const headers = version ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${version}"` } : {};
async function read(path) {
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  assert.equal(response.status, 200, `${path}: ${response.status}, ray=${response.headers.get("cf-ray")}`);
  return html;
}
const health = JSON.parse(await read("/api/health"));
if (version) assert.equal(health.version.id, version, "The override must reach the requested Worker");
console.log(`Health: ${health.version.id}`);

const targets = {
  "/spots/nagai-park": "長居公園は一周何キロ？",
  "/spots/nijo-castle-loop": "外周約2kmと掲載ルートの違い",
  "/spots/showa-kinen-park": "サイクリングコースは走れる？",
  "/spots/hikarigaoka-park": "どの駅から行ける？",
  "/spots/shin-yokohama-park": "荷物用ロッカーと貴重品用ロッカー",
  "/spots/meiji-jingu-gaien-loop": "日曜なら車道を走れる？",
  "/spots/kiba-park": "木場駅・清澄白河駅からのアクセス",
  "/spots/kinuta-park-cross-country": "現在、コースは一周できる？",
  "/spots/nakanoshima-loop": "中之島公園へのアクセス",
  "/spots/saiko-doman-green-park": "早朝・夕方は何時まで使える？",
  "/races/yokohama-marathon": "平坦な前半から、首都高の上りへ",
  "/races/mito-komon-marathon": "ゴール目前の「ラスボス坂」",
  "/races/fukuoka-marathon": "後半の山場、灘山の「のらん坂」",
  "/stations/sendai": "駅から近い順では榴岡公園、西公園の2候補です。",
  "/stations/shin-yokohama": "公園で着替えたい場合は",
  "/stations/nagai-osaka": "走る場所の選び方",
};
for (const [path, marker] of Object.entries(targets)) {
  const html = await read(path);
  assert(html.includes(marker), `${path}: missing server-rendered content`);
  assert(html.includes(`rel="canonical" href="${base}${path}"`), `${path}: canonical changed`);
  assert(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html), `${path}: unexpectedly noindex`);
  if (path.startsWith("/races/")) {
    assert(html.includes("体験を書く"), `${path}: review entry missing`);
    assert(!html.includes("取材前サンプル"), `${path}: preview story leaked`);
  }
  console.log(`PASS ${path}`);
}
const sitemap = await read("/sitemap.xml");
for (const path of Object.keys(targets)) {
  const block = sitemap.split("<url>").find((part) => part.includes(`<loc>${base}${path}</loc>`));
  const modified = block?.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  assert(
    modified && new Date(modified) >= new Date("2026-10-14T00:00:00+09:00"),
    `${path}: missing editorial update date`,
  );
}
for (const path of ["/stories/yokohama-2026", "/preview/stories/yokohama-2026"]) {
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(20000) });
  await response.arrayBuffer();
  assert.equal(response.status, 404, `${path}: sample story became public`);
}
console.log(
  `SEO smoke passed: 16 pages, canonical URLs, sitemap, and sample-story visibility. Version ${health.version.id}`,
);
