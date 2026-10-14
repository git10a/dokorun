import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const version = process.argv[2];
const base = "https://dokorun.com";
const headers = version ? { "Cloudflare-Workers-Version-Overrides": `dokorun="${version}"` } : {};
const entries = JSON.parse(readFileSync(new URL("../src/lib/race-preparation.json", import.meta.url)));
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#x27;");
async function read(path) {
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: ${response.status}, ray=${response.headers.get("cf-ray")}`);
  return response.text();
}
const health = JSON.parse(await read("/api/health"));
if (version) assert.equal(health.version.id, version, "Version override must reach the requested Worker");
console.log(`Health: ${health.version.id}`);
const queue = Object.entries(entries);
let checked = 0;
async function work() {
  while (queue.length) {
    const [slug, entry] = queue.shift();
    const path = `/races/${slug}`;
    const html = await read(path);
    const section = html.split('id="course-points"')[1]?.split("</section>")[0];
    assert(section, `${path}: missing preparation section`);
    for (const text of [
      entry.referenceLabel,
      entry.intro,
      entry.sourceNote,
      ...entry.points.flatMap((p) => [p.heading, p.body]),
    ]) {
      assert(section.includes(escape(text)), `${path}: missing preparation content: ${text}`);
    }
    for (const source of entry.sources) assert(section.includes(escape(source.url)), `${path}: missing source link`);
    for (const point of entry.points) {
      assert(section.includes(`>${escape(point.distance)}</span>`), `${path}: missing distance ${point.distance}`);
      assert(section.includes(`>${escape(point.distanceUnit)}</span>`), `${path}: missing distance unit`);
    }
    assert(html.includes(`rel="canonical" href="${base}${path}"`), `${path}: wrong canonical`);
    assert(!/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html), `${path}: noindex`);
    assert(html.includes("体験を書く"), `${path}: review entry missing`);
    assert(!html.includes("取材前サンプル"), `${path}: preview story leaked`);
    checked++;
    if (checked % 10 === 0) console.log(`Preparation verified: ${checked}/${Object.keys(entries).length}`);
  }
}
await Promise.all([work(), work()]);
const sitemap = await read("/sitemap.xml");
for (const slug of Object.keys(entries))
  assert(sitemap.includes(`<loc>${base}/races/${slug}</loc>`), `${slug}: missing sitemap entry`);
console.log(
  `PASS: ${checked} race pages, source editions, all point text and links, canonical and sitemap. Worker ${health.version.id}`,
);
