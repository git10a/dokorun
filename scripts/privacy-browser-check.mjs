import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const base = process.env.PRIVACY_CHECK_URL || "http://localhost:3123";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.createBrowserContext();
  await context.overridePermissions(base, ["geolocation"]);
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("dokorun:internal-traffic", "1");
    } catch {}
  });
  await page.setViewport({ width: 1200, height: 900 });
  await page.setGeolocation({ latitude: 35.681236, longitude: 139.767125 });
  const leaked = [];
  const errors = [];
  page.on("request", (request) => {
    const value = request.url() + " " + (request.postData() || "");
    if (value.includes("35.681236") || value.includes("139.767125") || /https?:.*[?&](lat|lng)=/.test(request.url()))
      leaked.push(request.url().split("?")[0]);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/spots?sort=near`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() =>
    [...document.querySelectorAll("button")].some((b) => b.textContent === "現在地を取得する"),
  );
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent === "現在地を取得する").click(),
  );
  await page.waitForFunction(() => document.body.innerText.includes("現在地から約"));
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(() => document.body.innerText.includes("現在地から約"));
  assert.deepEqual(leaked, []);
  assert.deepEqual(errors, []);
  assert.equal(new URL(page.url()).search, "?sort=near");
  await page.screenshot({ path: "/private/tmp/dokorun-privacy-nearby.png", fullPage: false });
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle2" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: "/private/tmp/dokorun-privacy-nearby-mobile.png", fullPage: false });
  await page.goto(`${base}/privacy`, { waitUntil: "networkidle2" });
  assert.ok((await page.$eval("body", (body) => body.innerText)).includes("保存期間と削除"));
  console.log(
    JSON.stringify({
      nearbySort: true,
      reloadPreserved: true,
      coordinateRequests: leaked.length,
      jsErrors: errors.length,
      mobileOverflow: false,
      privacyPolicy: true,
    }),
  );
} finally {
  await browser.close();
}
