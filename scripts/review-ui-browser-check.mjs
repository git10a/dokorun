// Synthetic accounts and writes exist only in a temporary local database.
import { copyFileSync, rmSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@libsql/client";
import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";

const file = `/tmp/dokorun-review-ui-${randomUUID()}.sqlite`;
const base = "http://localhost:3137";
const slug = "iwaki-sunshine-marathon";
const secret = "local-review-ui-synthetic-session-secret-only";
copyFileSync(".d1-build/prod.sqlite", file);
const client = createClient({ url: `file:${file}` });
const id = randomUUID(), other = randomUUID(), token = randomUUID(), now = Date.now();
for (const [userId, name, handle] of [[id, "確認用ランナーA", "review-ui-a"], [other, "確認用ランナーB", "review-ui-b"]]) {
  await client.execute({ sql: "INSERT INTO users(id,name,email,email_verified,handle) VALUES (?,?,?,1,?)", args: [userId, name, `${handle}@example.invalid`, handle] });
}
await client.execute({ sql: "INSERT INTO sessions(id,user_id,token,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)", args: [randomUUID(), id, token, now + 3600000, now, now] });
await client.execute({ sql: "INSERT INTO user_pbs(id,user_id,event,time_s) VALUES (?,?,'full',14399),(?,?,'half',5400)", args: [randomUUID(), id, randomUUID(), other] });
await client.execute({ sql: "UPDATE users SET custom_avatar_at = ? WHERE id = ?", args: [now,id] });
await client.execute({ sql: "INSERT INTO user_avatars(user_id,data,content_type) VALUES (?,?,'image/png')", args: [id, "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8U8AAAAASUVORK5CYII="] });
await client.execute({ sql: "INSERT INTO race_reviews(id,user_id,race_slug,race_year,finish_time_s,body) VALUES (?,?,?,2024,16326,'確認用の体験です。')", args: [randomUUID(),other,slug] });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3137"], {
  env: { ...process.env, D1_LOCAL_PATH: file, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: base, NEXT_PUBLIC_SITE_URL: base }, stdio: "ignore",
});
let browser;
try {
  for (let n = 0; n < 80; n++) {
    try { if ((await fetch(`${base}/healthz.txt`)).ok) break; } catch {}
    await new Promise(r => setTimeout(r,250));
  }
  browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:true });
  const page = await browser.newPage();
  const errors=[];
  page.on("pageerror", error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => localStorage.setItem("dokorun:internal-traffic","1"));
  await page.setCookie({ name:"dokorun.session_token", value:encodeURIComponent(`${token}.${createHmac("sha256",secret).update(token).digest("base64")}`),url:base,httpOnly:true,sameSite:"Lax" });
  await page.setViewport({width:390,height:844});
  await page.goto(`${base}/races/${slug}#reviews`, {waitUntil:"domcontentloaded"});
  await page.waitForFunction(() => document.querySelector("#write-review button:not([type=button])")?.disabled === false);
  await page.waitForSelector("#reviews article");
  assert.equal(await page.$eval("#write-review",el=>el.hidden),true);
  assert.equal(await page.$eval("#reviews",el=>el.innerText.includes("走った人の経験を")),false);
  assert.equal(await page.$eval("#reviews",el=>(el.innerText.match(/体験を書く/g)||[]).length),1);
  await page.click("#write-review-button");
  await page.waitForSelector("#write-review:not([hidden])");
  assert.equal(await page.$eval("#reviews article",el=>el.checkVisibility()),false);
  await page.select("select[name=raceYear]","2025");
  await page.type("[name=finishHours]","4");
  await page.type("[name=finishMinutes]","12");
  await page.type("[name=body]","ローカル確認用。ペースを守って走りました。");
  await page.click("#review-back-button");
  await page.click("#write-review-button");
  assert.equal(await page.$eval("[name=body]",el=>el.value),"ローカル確認用。ペースを守って走りました。");
  await page.click("#write-review button:not([type=button])");
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("体験を保存しました。"));
  assert.equal(await page.$eval("#write-review",el=>el.hidden),true);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("ローカル確認用。"));
  assert.equal(await page.$eval("#write-review",el=>el.hidden),true);
  let articles=await page.$$eval("#reviews article",els=>els.map(el=>el.innerText));
  assert.ok(articles.some(t=>t.includes("4:12:00")&&t.includes("サブ4")));
  assert.ok(articles.some(t=>t.includes("確認用ランナーB")&&!t.includes("サブ")));
  await page.waitForFunction(()=>[...document.querySelectorAll('#reviews article img')].some(img=>img.complete&&img.naturalWidth>0));
  await page.$eval("#reviews",el=>el.scrollIntoView({behavior:"instant",block:"start"}));
  await page.screenshot({path:"/tmp/dokorun-review-ui-mobile.png"});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await (await page.waitForSelector('::-p-xpath(//section[@id="reviews"]//button[normalize-space(.)="編集"])')).click();
  await page.waitForSelector("#write-review:not([hidden])");
  assert.equal(await page.$eval("select[name=raceYear]",el=>el.disabled),true);
  await page.$eval("[name=body]",el=>{el.value="";});
  await page.type("[name=body]","編集後も保存できました。");
  await page.click("#write-review button:not([type=button])");
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("体験を保存しました。"));
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("編集後も保存できました。"));
  await page.setViewport({width:1280,height:900});
  await page.$eval("#reviews",el=>el.scrollIntoView({behavior:"instant",block:"start"}));
  await page.screenshot({path:"/tmp/dokorun-review-ui-desktop.png"});
  const row=(await client.execute({sql:"SELECT body,finish_time_s FROM race_reviews WHERE user_id=?",args:[id]})).rows;
  assert.equal(row.length,1);assert.equal(row[0].body,"編集後も保存できました。");
  assert.equal(row[0].finish_time_s,15120);
  await client.execute({sql:"UPDATE user_pbs SET time_s=14400 WHERE user_id=? AND event='full'",args:[id]});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("サブ4.5"));
  await (await page.waitForSelector('::-p-xpath(//section[@id="reviews"]//button[normalize-space(.)="削除"])')).click();
  await (await page.waitForSelector('::-p-xpath(//section[@id="reviews"]//button[normalize-space(.)="削除する"])')).click();
  await page.waitForFunction(()=>document.querySelector("#reviews")?.innerText.includes("削除しました。"));
  assert.equal((await client.execute({sql:"SELECT count(*) AS n FROM race_reviews WHERE user_id=?",args:[id]})).rows[0].n,0);
  assert.deepEqual(errors,[]);
  console.log("PASS: one entry, no intro, list/form switching, draft retained on back, save/reload, edit/reload, delete, avatar, profile-only full PB, exact threshold, mobile/desktop");
} finally {
  await browser?.close(); server.kill(); client.close();
  for (const suffix of ["","-wal","-shm"]) rmSync(file+suffix,{force:true});
}
