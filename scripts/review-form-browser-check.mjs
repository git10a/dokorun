import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";

const base = process.env.REVIEW_CHECK_URL || "http://localhost:3000";
const version = process.env.REVIEW_CHECK_VERSION;
const slug = "iwaki-sunshine-marathon";
const destination = `/races/${slug}#write-review`;
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  let callbackURL;
  let googleNavigation = false;
  await page.evaluateOnNewDocument(() => localStorage.setItem("dokorun:internal-traffic", "1"));
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "accounts.google.com") {
      googleNavigation = true;
      return void request.abort(); // Stop before any real account or consent interaction.
    }
    if (url.pathname.endsWith("/reviews") && request.method() === "POST") {
      return void request.abort(); // This guest check must never publish a review.
    }
    if (url.pathname === "/api/auth/sign-in/social") callbackURL = JSON.parse(request.postData()).callbackURL;
    const headers = request.headers();
    if (version && url.origin === base) headers["Cloudflare-Workers-Version-Overrides"] = `dokorun="${version}"`;
    void request.continue({ headers });
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${base}${destination}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#write-review:not([hidden]) select[name=raceYear]", { visible: true });
  await page.select("select[name=raceYear]", "2025");
  await page.type("[name=finishHours]", "3");
  await page.type("[name=finishMinutes]", "45");
  await page.type("[name=body]", "入力確認用の下書き。投稿しません。");
  assert.equal(await page.$("[name=distanceKm]"), null);
  await page.$eval("#write-review", (element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.screenshot({ path: "/tmp/dokorun-review-mobile.png" });
  await page.waitForFunction(() => document.querySelector("#write-review button:not([type=button])")?.disabled === false);
  const [loginResponse] = await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click("#write-review button:not([type=button])"),
  ]);
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(loginResponse.status(), 200, "Login page must load successfully");
  if (process.env.REVIEW_CHECK_GOOGLE === "1") {
    const responsePromise = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/sign-in/social");
    await (await page.waitForSelector('::-p-xpath(//button[contains(normalize-space(.),"Googleで続ける")])')).click();
    const response = await responsePromise;
    if (response.status() !== 200) console.log("Auth failure", response.status(), (await response.text()).slice(0, 300));
    assert.equal(response.status(), 200);
    assert.equal(callbackURL, `${base}${destination}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(googleNavigation, true);
    console.log("PASS: login button sends absolute review callback; auth returns 200 and opens Google");
  }
  await page.goto(`${base}${destination}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[name=body]")?.value.includes("入力確認用"));
  const values = await page.$eval("#write-review form", (form) => Object.fromEntries(new FormData(form)));
  assert.equal(values.raceYear, "2025");
  assert.equal(values.finishHours, "3");
  assert.equal(values.finishMinutes, "45");
  assert.equal(values.finishSeconds, "00");
  await page.setViewport({ width: 1280, height: 900 });
  await page.$eval("#write-review", (element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.screenshot({ path: "/tmp/dokorun-review-desktop.png" });
  // A draft saved by the previous release must also survive this update.
  await page.evaluate((slug) => {
    sessionStorage.setItem(`dokorun:race-review-draft:${slug}`, JSON.stringify({
      version: 1, savedAt: Date.now(), ownerId: null, editing: false,
      raceYear: "2024", finishTime: "4:02:09", distanceKm: "30", body: "旧フォームの下書き確認",
    }));
  }, slug);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[name=finishSeconds]")?.value === "09");
  assert.equal(await page.$eval("[name=body]", (el) => el.value), "旧フォームの下書き確認");
  console.log("PASS: year selection, numeric time, optional seconds, removed distance, login/back restoration, legacy draft restoration");
} finally {
  await browser.close(); // Discard all synthetic drafts and cookies.
}
