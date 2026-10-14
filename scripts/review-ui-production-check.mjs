// Read-only UI verification; never submits reviews or interacts with real accounts.
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const base = "https://dokorun.com";
const version = process.env.REVIEW_CHECK_VERSION;
const headers = version ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${version}"` } : {};
const health = await (await fetch(`${base}/api/health`, { headers })).json();
assert.equal(health.ok, true);
if (version) assert.equal(health.version.id, version);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem("dokorun:internal-traffic", "1"));
  await page.setRequestInterception(true);
  page.on("request", request => {
    const url = new URL(request.url());
    if (request.method() !== "GET") return void request.abort();
    void request.continue({ headers: { ...request.headers(), ...(url.origin === base ? headers : {}) } });
  });
  for (const width of [390, 1280]) {
    await page.setViewport({ width, height: 900 });
    const listResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/races/iwaki-sunshine-marathon/reviews");
    await page.goto(`${base}/races/iwaki-sunshine-marathon#reviews`, { waitUntil: "domcontentloaded" });
    const response = await listResponse;
    assert.equal(response.status(), 200);
    const reviews = await response.json();
    assert.equal(reviews.available, true);
    for (const review of reviews.reviews) {
      assert.ok(Object.hasOwn(review, "userAvatarUrl"));
      assert.ok(Object.hasOwn(review, "userMarathonPbS"));
    }
    await page.waitForSelector("#write-review-button");
    const text = await page.$eval("#reviews", el => el.innerText);
    assert.equal((text.match(/体験を書く/g) || []).length, 1);
    assert.ok(!text.includes("走った人の経験を、レース計画の参考に。"));
    assert.ok(!text.includes("あなたの目標タイム"));
    assert.ok(!text.includes("体験を残す"));
    await page.click("#write-review-button");
    await page.waitForSelector("#write-review:not([hidden])");
    assert.ok(await page.$eval("#write-review", el => el.checkVisibility()));
    await page.select("select[name=raceYear]", "2025");
    await page.type("[name=body]", "非投稿の画面確認");
    await page.click("#review-back-button");
    assert.equal(await page.$eval("#write-review", el => el.hidden), true);
    await page.click("#write-review-button");
    assert.equal(await page.$eval("[name=body]", el => el.value), "非投稿の画面確認");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/dokorun-review-ui-live-${width}.png` });
    await page.click("#review-back-button");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#write-review-button");
    assert.equal(await page.$eval("#write-review", el => el.hidden), true);
    console.log(`PASS ${width}px: one entry, no intro/filter, input/back, draft retained, reload list; reviews API 200`);
  }
  console.log(`Verified deployment: ${health.version.id}`);
} finally { await browser.close(); }
