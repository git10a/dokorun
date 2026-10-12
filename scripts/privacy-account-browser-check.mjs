import {copyFileSync,readFileSync,rmSync} from 'node:fs';
import {randomUUID,createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createClient} from '@libsql/client';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const file='/private/tmp/dokorun-privacy-account-check.sqlite';
const base='http://localhost:3124',secret='local-privacy-browser-test-secret-only-32-chars';
copyFileSync('.d1-build/prod.sqlite',file);
const client=createClient({url:`file:${file}`});
await client.executeMultiple(readFileSync('scripts/sql/2026-10-12-privacy.sql','utf8'));
const id=randomUUID(),token=randomUUID(),now=Date.now();
await client.execute({sql:"INSERT INTO users(id,name,email,email_verified,handle) VALUES (?,'ランナー','synthetic@example.invalid',1,'privacy-synthetic')",args:[id]});
await client.execute({sql:'INSERT INTO sessions(id,user_id,token,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)',args:[randomUUID(),id,token,now+3600000,now,now]});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3124'],{env:{...process.env,D1_LOCAL_PATH:file,D1_PUBLIC_SNAPSHOT:'1',BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:base,NEXT_PUBLIC_SITE_URL:base},stdio:'ignore'});
let browser;
try{
 for(let n=0;n<40;n++) {try{if((await fetch(`${base}/healthz.txt`)).ok)break;}catch{}await new Promise((r)=>setTimeout(r,250));}
 browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.setCookie({name:'dokorun.session_token',value:encodeURIComponent(`${token}.${createHmac('sha256',secret).update(token).digest('base64')}`),url:base,httpOnly:true,sameSite:'Lax'});
 await page.goto(`${base}/me/profile`,{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>document.body.innerText.includes('退会してデータを削除'));
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].find((b)=>b.textContent==='退会してデータを削除').disabled),true);
 await page.evaluate(()=>{const box=[...document.querySelectorAll('input[type=checkbox]')].at(-1);box.scrollIntoView();box.click();});
 await page.screenshot({path:'/private/tmp/dokorun-privacy-account-delete.png',fullPage:false});
 await page.evaluate(()=>[...document.querySelectorAll('button')].find((b)=>b.textContent==='退会してデータを削除').click());
 await page.waitForFunction(()=>location.pathname==='/');
 assert.equal((await client.execute('SELECT count(*) AS n FROM users')).rows[0].n,0);
 assert.equal((await client.execute('SELECT count(*) AS n FROM sessions')).rows[0].n,0);
 console.log(JSON.stringify({syntheticLocalAccount:true,confirmationRequired:true,deleteThroughBrowser:true,usersRemaining:0,sessionsRemaining:0}));
}finally{await browser?.close();server.kill('SIGTERM');client.close();for(const suffix of['','-wal','-shm'])rmSync(file+suffix,{force:true});}
