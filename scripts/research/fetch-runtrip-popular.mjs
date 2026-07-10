#!/usr/bin/env node

import { createClient } from "@libsql/client";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://runtrip.jp";
const USER_AGENT = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "AppleWebKit/537.36 (KHTML, like Gecko)",
  "Chrome/126.0.0.0 Safari/537.36",
  "dokorun-research/1.0",
].join(" ");
const MIN_SLEEP_MS = Number(process.env.RUNTRIP_MIN_SLEEP_MS ?? 1500);
const MAX_SLEEP_MS = Number(process.env.RUNTRIP_MAX_SLEEP_MS ?? 2000);
const MAX_TOTAL_REQUESTS = 150;
const MAX_DRILL_REQUESTS = 90;
const OUTPUT_JSON = "data/research/runtrip-popular.json";
const OUTPUT_MARKDOWN = "docs/research/runtrip-popular.md";
const JAPAN_BBOX = { minLat: 24, maxLat: 46, minLng: 122, maxLng: 154 };
const courseFields = [
  "id",
  "title",
  "description",
  "distance",
  "favoriteCount",
  "viewCount",
  "visitCount",
  "prefecturesId",
  "prefecturesName",
  "areaId",
  "areaName",
  "address",
  "startLatitude",
  "startLongitude",
  "recommendTimezone",
  "signal",
  "roadType",
  "lamp",
  "elevation",
  "routeType",
  "createdAt",
];

const prefectures = [
  ["hokkaido", 1], ["aomori", 2], ["iwate", 3], ["miyagi", 4], ["akita", 5], ["yamagata", 6], ["fukushima", 7],
  ["ibaraki", 8], ["tochigi", 9], ["gunma", 10], ["saitama", 11], ["chiba", 12], ["tokyo", 13], ["kanagawa", 14],
  ["niigata", 15], ["toyama", 16], ["ishikawa", 17], ["fukui", 18], ["yamanashi", 19], ["nagano", 20], ["gifu", 21],
  ["shizuoka", 22], ["aichi", 23], ["mie", 24], ["shiga", 25], ["kyoto", 26], ["osaka", 27], ["hyogo", 28],
  ["nara", 29], ["wakayama", 30], ["tottori", 31], ["shimane", 32], ["okayama", 33], ["hiroshima", 34],
  ["yamaguchi", 35], ["tokushima", 36], ["kagawa", 37], ["ehime", 38], ["kochi", 39], ["fukuoka", 40],
  ["saga", 41], ["nagasaki", 42], ["kumamoto", 43], ["oita", 44], ["miyazaki", 45], ["kagoshima", 46],
  ["okinawa", 47],
];

const cityCodesByPref = {
  hokkaido: ["01100", "01202", "01204", "01213", "01217", "01224", "01206", "01208", "01210", "01212"],
  aomori: ["02201", "02202", "02203", "02204", "02205", "02206", "02207", "02208", "02209", "02210"],
  iwate: ["03201", "03202", "03205", "03206", "03209", "03208", "03207", "03210", "03211", "03213"],
  miyagi: ["04100", "04202", "04203", "04205", "04206", "04207", "04208", "04209", "04211", "04212"],
  akita: ["05201", "05202", "05203", "05204", "05206", "05207", "05209", "05210", "05211", "05212"],
  yamagata: ["06201", "06202", "06203", "06204", "06205", "06206", "06207", "06208", "06209", "06210"],
  fukushima: ["07201", "07202", "07203", "07204", "07205", "07207", "07208", "07209", "07210", "07211"],
  ibaraki: ["08201", "08202", "08203", "08204", "08205", "08207", "08208", "08210", "08211", "08212"],
  tochigi: ["09201", "09202", "09203", "09204", "09205", "09206", "09208", "09209", "09210", "09211"],
  gunma: ["10201", "10202", "10203", "10204", "10205", "10206", "10207", "10208", "10209", "10210"],
  saitama: ["11100", "11201", "11202", "11203", "11208", "11209", "11210", "11214", "11215", "11219"],
  chiba: ["12100", "12204", "12207", "12203", "12217", "12220", "12216", "12206", "12221", "12211"],
  tokyo: ["13101", "13102", "13103", "13104", "13105", "13108", "13109", "13110", "13111", "13112"],
  kanagawa: ["14100", "14130", "14150", "14201", "14203", "14205", "14206", "14207", "14210", "14213"],
  niigata: ["15100", "15202", "15204", "15205", "15206", "15208", "15210", "15211", "15213", "15216"],
  toyama: ["16201", "16202", "16204", "16205", "16206", "16207", "16208", "16209", "16210", "16211"],
  ishikawa: ["17201", "17202", "17203", "17204", "17205", "17206", "17207", "17209", "17210", "17211"],
  fukui: ["18201", "18202", "18204", "18205", "18206", "18207", "18208", "18209", "18210"],
  yamanashi: ["19201", "19202", "19204", "19205", "19206", "19207", "19208", "19209", "19210", "19211"],
  nagano: ["20201", "20202", "20203", "20204", "20205", "20206", "20207", "20208", "20209", "20210"],
  gifu: ["21201", "21202", "21203", "21204", "21205", "21206", "21207", "21208", "21209", "21210"],
  shizuoka: ["22100", "22130", "22203", "22205", "22207", "22210", "22211", "22212", "22213", "22214"],
  aichi: ["23100", "23201", "23202", "23203", "23205", "23206", "23207", "23208", "23209", "23210"],
  mie: ["24201", "24202", "24203", "24204", "24205", "24207", "24208", "24209", "24210", "24211"],
  shiga: ["25201", "25202", "25203", "25204", "25206", "25207", "25208", "25209", "25210", "25211"],
  kyoto: ["26100", "26201", "26202", "26203", "26204", "26205", "26206", "26207", "26208", "26209"],
  osaka: ["27100", "27140", "27203", "27205", "27207", "27209", "27211", "27212", "27215", "27220"],
  hyogo: ["28100", "28201", "28202", "28203", "28204", "28207", "28210", "28212", "28214", "28217"],
  nara: ["29201", "29202", "29203", "29204", "29205", "29206", "29207", "29208", "29209", "29210"],
  wakayama: ["30201", "30202", "30203", "30204", "30205", "30206", "30207", "30208", "30209"],
  tottori: ["31201", "31202", "31203", "31204"],
  shimane: ["32201", "32202", "32203", "32204", "32205", "32206", "32207", "32209"],
  okayama: ["33100", "33202", "33203", "33204", "33205", "33207", "33208", "33209", "33210", "33211"],
  hiroshima: ["34100", "34202", "34203", "34204", "34205", "34207", "34208", "34209", "34210", "34211"],
  yamaguchi: ["35201", "35202", "35203", "35204", "35206", "35207", "35208", "35210", "35211", "35212"],
  tokushima: ["36201", "36202", "36203", "36204", "36205", "36206", "36207", "36208"],
  kagawa: ["37201", "37202", "37203", "37204", "37205", "37206", "37207", "37208"],
  ehime: ["38201", "38202", "38203", "38204", "38205", "38206", "38207", "38210", "38213", "38214"],
  kochi: ["39201", "39202", "39203", "39204", "39205", "39206", "39208", "39209", "39210", "39211"],
  fukuoka: ["40100", "40130", "40202", "40203", "40205", "40206", "40207", "40210", "40211", "40213"],
  saga: ["41201", "41202", "41203", "41204", "41205", "41206", "41207", "41208", "41209", "41210"],
  nagasaki: ["42201", "42202", "42203", "42204", "42205", "42207", "42208", "42209", "42210", "42211"],
  kumamoto: ["43100", "43202", "43203", "43204", "43205", "43206", "43208", "43210", "43211", "43212"],
  oita: ["44201", "44202", "44203", "44204", "44205", "44206", "44207", "44208", "44209", "44210"],
  miyazaki: ["45201", "45202", "45203", "45204", "45205", "45206", "45207", "45208", "45209"],
  kagoshima: ["46201", "46203", "46204", "46206", "46208", "46210", "46213", "46214", "46215", "46216"],
  okinawa: ["47201", "47205", "47207", "47208", "47209", "47210", "47211", "47212", "47213", "47215"],
};

let requestCount = 0;
let consecutiveHttpErrors = 0;
const skippedPages = [];
const pageSummaries = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleepMs() {
  if (MAX_SLEEP_MS <= MIN_SLEEP_MS) return MIN_SLEEP_MS;
  return Math.round(MIN_SLEEP_MS + Math.random() * (MAX_SLEEP_MS - MIN_SLEEP_MS));
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inJapanBbox(lat, lng) {
  return lat >= JAPAN_BBOX.minLat && lat <= JAPAN_BBOX.maxLat && lng >= JAPAN_BBOX.minLng && lng <= JAPAN_BBOX.maxLng;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const radiusKm = 6371.0088;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

async function fetchHtml(url) {
  if (requestCount >= MAX_TOTAL_REQUESTS) {
    throw new Error(`総リクエスト数が上限(${MAX_TOTAL_REQUESTS})に達しました`);
  }
  if (requestCount > 0) await sleep(sleepMs());
  requestCount += 1;
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      "user-agent": USER_AGENT,
    },
  });
  if (response.status >= 400) {
    consecutiveHttpErrors += 1;
    if (consecutiveHttpErrors >= 3) {
      throw new Error(`HTTP ${response.status} が3連続したため中断しました: ${url}`);
    }
  } else {
    consecutiveHttpErrors = 0;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.text();
}

function extractCoursesFromHtml(html, url) {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("__NEXT_DATA__ が見つかりません");
  const nextData = JSON.parse(match[1]);
  const fallback = nextData?.props?.pageProps?.swr?.fallback;
  if (!fallback || typeof fallback !== "object") throw new Error("SWR fallback が見つかりません");
  const fallbackEntry = Object.entries(fallback).find(([key, value]) =>
    key.includes("/v1/courses") && value && typeof value === "object" && Array.isArray(value.courses)
  );
  if (!fallbackEntry) throw new Error("/v1/courses の fallback が見つかりません");
  const [, payload] = fallbackEntry;
  return {
    metadata: payload.metadata ?? {},
    courses: payload.courses ?? [],
    url,
  };
}

async function fetchCoursePage(page) {
  try {
    const html = await fetchHtml(page.url);
    const parsed = extractCoursesFromHtml(html, page.url);
    const courses = parsed.courses.map((entry) => entry?.course?.course).filter(Boolean);
    pageSummaries.push({
      ...page,
      total: asNumber(parsed.metadata.total),
      pageNumber: asNumber(parsed.metadata.pageNumber),
      pageSize: asNumber(parsed.metadata.pageSize),
      courseCount: courses.length,
    });
    if (!courses.length) {
      skippedPages.push({ url: page.url, reason: "コース0件", label: page.label });
    }
    console.log(`[${requestCount}/${MAX_TOTAL_REQUESTS}] ${page.label}: ${courses.length}件 / total ${parsed.metadata.total ?? "unknown"}`);
    return { page, metadata: parsed.metadata, courses };
  } catch (error) {
    skippedPages.push({ url: page.url, reason: error instanceof Error ? error.message : String(error), label: page.label });
    console.warn(`[skip] ${page.label}: ${error instanceof Error ? error.message : String(error)}`);
    return { page, metadata: {}, courses: [] };
  }
}

async function findLocalD1Path() {
  if (process.env.D1_LOCAL_PATH) return process.env.D1_LOCAL_PATH;
  const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
  const entries = await readdir(dir).catch(() => []);
  const candidates = [];
  for (const file of entries) {
    if (!file.endsWith(".sqlite") || file === "metadata.sqlite") continue;
    const fullPath = path.join(dir, file);
    const info = await stat(fullPath);
    candidates.push({ fullPath, mtimeMs: info.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.fullPath ?? null;
}

async function loadExistingSpots() {
  const dbPath = await findLocalD1Path();
  if (!dbPath) {
    throw new Error("ローカルD1が見つかりません。D1_LOCAL_PATH を指定するか、wrangler local D1 を初期化してください");
  }
  const client = createClient({ url: `file:${dbPath}` });
  const result = await client.execute({
    sql: "select slug, name, lat, lng from spots where is_published = 1 order by slug",
    args: [],
  });
  return result.rows.map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    lat: Number(row.lat),
    lng: Number(row.lng),
  })).filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng));
}

function closestSpot(course, spots) {
  if (!spots.length) return null;
  let closest = null;
  for (const spot of spots) {
    const distanceKm = haversineKm(course.startLatitude, course.startLongitude, spot.lat, spot.lng);
    if (!closest || distanceKm < closest.distanceKm) {
      closest = {
        slug: spot.slug,
        name: spot.name,
        distanceKm: Number(distanceKm.toFixed(3)),
        distanceM: Math.round(distanceKm * 1000),
      };
    }
  }
  return closest;
}

function normalizeCourse(raw, sourcePage, fetchedAt, existingSpots) {
  const id = raw.id === null || raw.id === undefined ? null : String(raw.id);
  const startLatitude = asNumber(raw.startLatitude);
  const startLongitude = asNumber(raw.startLongitude);
  if (!id) return { skipped: "idなし" };
  if (startLatitude === null || startLongitude === null) return { skipped: "座標なし" };
  if (!inJapanBbox(startLatitude, startLongitude)) return { skipped: "日本bbox外" };

  const course = Object.fromEntries(courseFields.map((field) => [field, raw[field] ?? null]));
  course.id = id;
  course.distance = asNumber(raw.distance);
  course.favoriteCount = asNumber(raw.favoriteCount) ?? 0;
  course.viewCount = asNumber(raw.viewCount);
  course.visitCount = asNumber(raw.visitCount);
  course.startLatitude = startLatitude;
  course.startLongitude = startLongitude;
  course.runtripUrl = `${BASE_URL}/courses/${id}`;
  course.sourcePages = [{
    type: sourcePage.type,
    label: sourcePage.label,
    url: sourcePage.url,
    fetchedAt,
  }];
  course.fetchedAt = fetchedAt;
  const closest = closestSpot(course, existingSpots);
  course.closestExistingSpot = closest;
  course.duplicateCandidate = closest && closest.distanceKm <= 2 ? closest : null;
  return { course };
}

function mergeSource(existing, incoming) {
  const seen = new Set(existing.sourcePages.map((page) => page.url));
  for (const page of incoming.sourcePages) {
    if (!seen.has(page.url)) existing.sourcePages.push(page);
  }
}

function buildDrillPages(prefResults) {
  const highPrefs = prefResults
    .filter(({ page, metadata }) => (asNumber(metadata.total) ?? 0) > 200 && cityCodesByPref[page.slug]?.length)
    .map(({ page }) => page.slug);
  const pages = [];
  for (let index = 0; index < 10 && pages.length < MAX_DRILL_REQUESTS; index += 1) {
    for (const slug of highPrefs) {
      const code = cityCodesByPref[slug]?.[index];
      if (!code) continue;
      pages.push({
        type: "city",
        slug,
        cityCode: code,
        label: `${slug}/${code}`,
        url: `${BASE_URL}/courses/${slug}/${code}?sort=1`,
      });
      if (pages.length >= MAX_DRILL_REQUESTS) break;
    }
  }
  return pages;
}

function buildMarkdown(courses, summary, generatedAt) {
  const top = courses.slice(0, 300);
  const lines = [
    "# Runtrip人気コース参考リスト",
    "",
    `生成日時: ${generatedAt}`,
    "",
    "Runtrip公開一覧ページのSSRデータから取得した、ドコラン掲載候補を選ぶための内部リサーチ資料です。説明文・画像・ルートは掲載転用しない前提です。",
    "",
    "## サマリ",
    "",
    `- ユニークコース: ${summary.uniqueCourses}`,
    `- favoriteCount >= 10: ${summary.favoriteCountGte10}`,
    `- 総リクエスト: ${summary.requestCount}`,
    `- スキップページ: ${summary.skippedPages}`,
    `- 座標不正で除外: ${summary.skippedInvalidCourses}`,
    `- 既存重複候補(2km以内): ${summary.duplicateCandidates}`,
    "",
    "## 上位300件",
    "",
    "| 順位 | タイトル | 都道府県・エリア | 距離km | 行きたい数 | 開始座標 | runtrip URL | 既存スポットとの距離 |",
    "| ---: | --- | --- | ---: | ---: | --- | --- | --- |",
  ];
  top.forEach((course, index) => {
    const distanceKm = course.distance === null ? "" : (course.distance / 1000).toFixed(1);
    const area = [course.prefecturesName, course.areaName].filter(Boolean).join(" / ");
    const coord = `${course.startLatitude.toFixed(5)}, ${course.startLongitude.toFixed(5)}`;
    const closest = course.closestExistingSpot
      ? `${course.duplicateCandidate ? course.closestExistingSpot.slug : "最寄り"} (${course.closestExistingSpot.distanceKm.toFixed(1)}km)`
      : "";
    lines.push([
      index + 1,
      markdownCell(course.title),
      markdownCell(area),
      distanceKm,
      course.favoriteCount ?? 0,
      coord,
      course.runtripUrl,
      markdownCell(closest),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  });
  return `${lines.join("\n")}\n`;
}

function assertOutput(courses, summary) {
  const ids = new Set(courses.map((course) => course.id));
  const errors = [];
  if (courses.length < 500) errors.push(`ユニークコースが500件未満です: ${courses.length}`);
  if (summary.favoriteCountGte10 < 300) errors.push(`favoriteCount >= 10 が300件未満です: ${summary.favoriteCountGte10}`);
  if (ids.size !== courses.length) errors.push("id重複があります");
  const outOfBounds = courses.filter((course) => !inJapanBbox(course.startLatitude, course.startLongitude));
  if (outOfBounds.length) errors.push(`日本bbox外の座標があります: ${outOfBounds.length}件`);
  if (requestCount > MAX_TOTAL_REQUESTS) errors.push(`総リクエストが${MAX_TOTAL_REQUESTS}を超えました: ${requestCount}`);
  if (errors.length) {
    throw new Error(`合格基準未達:\n- ${errors.join("\n- ")}`);
  }
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const existingSpots = await loadExistingSpots();
  console.log(`既存公開スポット: ${existingSpots.length}件`);

  const nationwide = await fetchCoursePage({
    type: "national",
    label: "全国",
    url: `${BASE_URL}/courses?sort=1`,
  });

  const prefResults = [];
  for (const [slug, prefecturesId] of prefectures) {
    prefResults.push(await fetchCoursePage({
      type: "prefecture",
      slug,
      prefecturesId,
      label: slug,
      url: `${BASE_URL}/courses/${slug}?sort=1`,
    }));
  }

  const drillPages = buildDrillPages(prefResults);
  console.log(`市区町村ドリルダウン対象: ${drillPages.length}ページ`);
  const drillResults = [];
  for (const page of drillPages) {
    drillResults.push(await fetchCoursePage(page));
  }

  const byId = new Map();
  let skippedInvalidCourses = 0;
  for (const result of [nationwide, ...prefResults, ...drillResults]) {
    for (const raw of result.courses) {
      const normalized = normalizeCourse(raw, result.page, fetchedAt, existingSpots);
      if (normalized.skipped) {
        skippedInvalidCourses += 1;
        continue;
      }
      const existing = byId.get(normalized.course.id);
      if (existing) {
        mergeSource(existing, normalized.course);
      } else {
        byId.set(normalized.course.id, normalized.course);
      }
    }
  }

  const courses = [...byId.values()].sort((a, b) =>
    (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0) || String(a.id).localeCompare(String(b.id), "ja")
  );
  const summary = {
    generatedAt: fetchedAt,
    requestCount,
    skippedPages: skippedPages.length,
    skippedInvalidCourses,
    uniqueCourses: courses.length,
    favoriteCountGte10: courses.filter((course) => (course.favoriteCount ?? 0) >= 10).length,
    duplicateCandidates: courses.filter((course) => course.duplicateCandidate).length,
    existingSpotCount: existingSpots.length,
  };

  assertOutput(courses, summary);

  const payload = {
    generatedAt: fetchedAt,
    source: {
      site: BASE_URL,
      sort: "popular (sort=1)",
      userAgent: USER_AGENT,
      note: "Internal research only. Do not reuse Runtrip descriptions, images, or routes in Dokorun public pages or DB.",
    },
    summary,
    pageSummaries,
    skippedPages,
    courses,
  };

  await mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await mkdir(path.dirname(OUTPUT_MARKDOWN), { recursive: true });
  await writeFile(OUTPUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(OUTPUT_MARKDOWN, buildMarkdown(courses, summary, fetchedAt));

  JSON.parse(await readFile(OUTPUT_JSON, "utf8"));
  console.log("完了:");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`JSON: ${OUTPUT_JSON}`);
  console.log(`Markdown: ${OUTPUT_MARKDOWN}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
