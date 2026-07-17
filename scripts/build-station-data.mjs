import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import KuroshiroModule from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import Hepburn from "hepburn";

const Kuroshiro = KuroshiroModule.default;

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, "data", "ekidata");
const OUTPUT_DIR = path.join(ROOT, "data", "stations");
const STATION_RADIUS_M = 2_000;
const MAX_HOPS = 3;

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県",
  "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
  "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const PREFECTURE_ROMAJI = [
  "hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima", "ibaraki", "tochigi", "gunma",
  "saitama", "chiba", "tokyo", "kanagawa", "niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano",
  "gifu", "shizuoka", "aichi", "mie", "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama",
  "tottori", "shimane", "okayama", "hiroshima", "yamaguchi", "tokushima", "kagawa", "ehime", "kochi", "fukuoka",
  "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...values] = rows;
  if (!headers) return [];
  return values.map((valuesRow) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), valuesRow[index] ?? ""])));
}

function prefectureFor(row, postalPrefectures) {
  const prefCode = Number(row.pref_cd);
  if (prefCode >= 1 && prefCode <= PREFECTURES.length) return PREFECTURES[prefCode - 1];
  const postalCode = row.post?.replace(/-/g, "");
  if (postalCode && postalPrefectures[postalCode]) return postalPrefectures[postalCode];
  return PREFECTURES.find((prefecture) => row.address?.startsWith(prefecture)) ?? "その他";
}

function haversineM(lat1, lng1, lat2, lng2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizedSlug(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/ō/g, "o")
    .replace(/ū/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}

function dbPathFromArgs() {
  const dbIndex = process.argv.indexOf("--db");
  if (dbIndex >= 0 && process.argv[dbIndex + 1]) return path.resolve(process.argv[dbIndex + 1]);
  if (process.env.D1_LOCAL_PATH) return path.resolve(process.env.D1_LOCAL_PATH);
  return path.join(ROOT, ".d1-build", "prod.sqlite");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadExistingSlugs() {
  const filePath = path.join(OUTPUT_DIR, "slugs.json");
  if (!(await fileExists(filePath))) return {};
  return JSON.parse(await readFile(filePath, "utf8"));
}

function loadPublishedSpots(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare("select slug, name, lat, lng, prefecture from spots where is_published = 1 order by slug").all();
  } finally {
    db.close();
  }
}

function bfs(graph, from) {
  const routes = new Map();
  const queue = [];
  const visited = new Set();
  for (const edge of graph.get(from) ?? []) {
    const key = `${edge.lineName}:${edge.to}`;
    if (visited.has(key)) continue;
    visited.add(key);
    queue.push({ groupCode: edge.to, hops: 1, lineName: edge.lineName });
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const previous = routes.get(current.groupCode);
    if (!previous || current.hops < previous.hops) routes.set(current.groupCode, { hops: current.hops, lines: [current.lineName] });
    if (current.hops >= MAX_HOPS) continue;
    for (const edge of graph.get(current.groupCode) ?? []) {
      if (edge.lineName !== current.lineName) continue;
      const hops = current.hops + 1;
      const key = `${current.lineName}:${edge.to}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ groupCode: edge.to, hops, lineName: current.lineName });
    }
  }
  routes.delete(from);
  return routes;
}

async function main() {
  const [stationCsv, lineCsv, joinCsv] = await Promise.all([
    readFile(path.join(INPUT_DIR, "station.csv"), "utf8"),
    readFile(path.join(INPUT_DIR, "line.csv"), "utf8"),
    readFile(path.join(INPUT_DIR, "join.csv"), "utf8"),
  ]);
  const postalPrefecturePath = path.join(INPUT_DIR, "postal-prefectures.json");
  const postalPrefectures = await fileExists(postalPrefecturePath)
    ? JSON.parse(await readFile(postalPrefecturePath, "utf8"))
    : {};
  const stationRows = parseCsv(stationCsv).filter((row) => Number(row.e_status || 0) === 0 && Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lon)));
  const lineRows = parseCsv(lineCsv).filter((row) => Number(row.e_status || 0) !== 2);
  const joinRows = parseCsv(joinCsv);
  const lineNames = new Map(lineRows.map((row) => [String(row.line_cd), row.line_name]));
  const stationCodeToGroup = new Map(stationRows.map((row) => [String(row.station_cd), String(row.station_g_cd || row.station_cd)]));
  const groups = new Map();

  for (const row of stationRows) {
    const groupCode = String(row.station_g_cd || row.station_cd);
    const group = groups.get(groupCode) ?? { groupCode, rows: [], stationCodes: new Set(), lineNames: new Set() };
    group.rows.push(row);
    group.stationCodes.add(String(row.station_cd));
    const lineName = lineNames.get(String(row.line_cd));
    if (lineName) group.lineNames.add(lineName);
    groups.set(groupCode, group);
  }

  const graph = new Map();
  function addEdge(from, to, lineName) {
    if (from === to || !lineName) return;
    const edges = graph.get(from) ?? [];
    if (!edges.some((edge) => edge.to === to && edge.lineName === lineName)) edges.push({ to, lineName });
    graph.set(from, edges);
  }
  for (const row of joinRows) {
    const from = stationCodeToGroup.get(String(row.station_cd1));
    const to = stationCodeToGroup.get(String(row.station_cd2));
    const lineName = lineNames.get(String(row.line_cd));
    if (!from || !to || !lineName) continue;
    addEdge(from, to, lineName);
    addEdge(to, from, lineName);
  }

  const needsReading = [...groups.values()].some((group) => !group.rows.some((row) => row.station_name_k || row.station_name_r));
  let kuroshiro = null;
  if (needsReading) {
    kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
  }

  for (const group of groups.values()) {
    const representative = group.rows[0];
    const kanaFromCsv = group.rows.find((row) => row.station_name_k)?.station_name_k;
    const romajiFromCsv = group.rows.find((row) => row.station_name_r)?.station_name_r;
    const kana = kanaFromCsv
      ? await Kuroshiro.Util.katakanaToHiragana(kanaFromCsv)
      : kuroshiro
        ? await kuroshiro.convert(representative.station_name, { to: "hiragana", mode: "normal" })
        : representative.station_name;
    const romaji = romajiFromCsv || (Kuroshiro.Util.hasKana(kana) ? Hepburn.fromKana(kana) : group.groupCode);
    group.name = representative.station_name;
    group.kana = kana;
    group.baseSlug = normalizedSlug(romaji) || `station-${group.groupCode}`;
    group.prefecture = prefectureFor(representative, postalPrefectures);
    group.lat = group.rows.reduce((sum, row) => sum + Number(row.lat), 0) / group.rows.length;
    group.lng = group.rows.reduce((sum, row) => sum + Number(row.lon), 0) / group.rows.length;
  }

  const existingSlugs = await loadExistingSlugs();
  const slugCounts = new Map();
  for (const group of groups.values()) slugCounts.set(group.baseSlug, (slugCounts.get(group.baseSlug) ?? 0) + 1);
  const usedSlugs = new Set(Object.values(existingSlugs));
  const slugMap = { ...existingSlugs };
  for (const group of [...groups.values()].sort((a, b) => a.groupCode.localeCompare(b.groupCode))) {
    if (existingSlugs[group.groupCode]) {
      group.slug = existingSlugs[group.groupCode];
      continue;
    }
    let slug = group.baseSlug;
    if ((slugCounts.get(group.baseSlug) ?? 0) > 1 || usedSlugs.has(slug)) {
      const prefIndex = PREFECTURES.indexOf(group.prefecture);
      slug = `${group.baseSlug}-${PREFECTURE_ROMAJI[prefIndex] ?? "other"}`;
    }
    if (usedSlugs.has(slug)) slug = `${slug}-${group.groupCode}`;
    group.slug = slug;
    slugMap[group.groupCode] = slug;
    usedSlugs.add(slug);
  }

  const dbPath = dbPathFromArgs();
  if (!(await fileExists(dbPath))) throw new Error(`D1 snapshot not found: ${dbPath}. Pass --db or set D1_LOCAL_PATH.`);
  const spots = loadPublishedSpots(dbPath);
  for (const group of groups.values()) {
    group.nearbySpots = [];
    for (const spot of spots) {
      const distanceM = haversineM(group.lat, group.lng, Number(spot.lat), Number(spot.lng));
      if (distanceM <= STATION_RADIUS_M) group.nearbySpots.push({ slug: spot.slug, distanceM, walkMinutes: Math.ceil(distanceM / 80) });
    }
    group.nearbySpots.sort((a, b) => a.distanceM - b.distanceM || a.slug.localeCompare(b.slug));
  }

  for (const group of groups.values()) {
    const candidates = new Map();
    for (const [destinationCode, route] of bfs(graph, group.groupCode)) {
      const destination = groups.get(destinationCode);
      if (!destination) continue;
      for (const nearby of destination.nearbySpots) {
        if (group.nearbySpots.some((item) => item.slug === nearby.slug)) continue;
        const candidate = {
          slug: nearby.slug,
          lineName: route.lines.join("・"),
          stationCount: route.hops,
          destinationStationName: destination.name,
          distanceM: nearby.distanceM,
          walkMinutes: nearby.walkMinutes,
        };
        const previous = candidates.get(nearby.slug);
        if (!previous || candidate.stationCount < previous.stationCount || (candidate.stationCount === previous.stationCount && candidate.walkMinutes < previous.walkMinutes)) {
          candidates.set(nearby.slug, candidate);
        }
      }
    }
    group.oneStationSpots = [...candidates.values()].sort((a, b) => a.stationCount - b.stationCount || a.walkMinutes - b.walkMinutes || a.slug.localeCompare(b.slug));
  }

  const pageGroups = [...groups.values()].filter((group) => group.nearbySpots.length >= 1 || group.oneStationSpots.length >= 2);
  const pageCodes = new Set(pageGroups.map((group) => group.groupCode));
  const stations = pageGroups.map((group) => ({
    slug: group.slug,
    name: group.name,
    kana: group.kana,
    prefecture: group.prefecture,
    lat: Number(group.lat.toFixed(6)),
    lng: Number(group.lng.toFixed(6)),
    lineNames: [...group.lineNames].sort(),
    lines: group.rows
      .map((row) => ({ slug: String(row.line_cd), name: lineNames.get(String(row.line_cd)) }))
      .filter((line) => line.name)
      .filter((line, index, items) => items.findIndex((candidate) => candidate.slug === line.slug) === index)
      .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    nearbySpots: group.nearbySpots,
    oneStationSpots: group.oneStationSpots,
    adjacentStations: (graph.get(group.groupCode) ?? [])
      .filter((edge) => pageCodes.has(edge.to))
      .map((edge) => ({ slug: groups.get(edge.to).slug, name: groups.get(edge.to).name, lineName: edge.lineName }))
      .filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug && candidate.lineName === item.lineName) === index)
      .sort((a, b) => a.lineName.localeCompare(b.lineName, "ja") || a.name.localeCompare(b.name, "ja")),
  })).sort((a, b) => a.prefecture.localeCompare(b.prefecture, "ja") || a.kana.localeCompare(b.kana, "ja"));

  const spotStations = {};
  for (const station of stations) {
    for (const nearby of station.nearbySpots) {
      const items = spotStations[nearby.slug] ?? [];
      items.push({ slug: station.slug, name: station.name, distanceM: nearby.distanceM, walkMinutes: nearby.walkMinutes });
      spotStations[nearby.slug] = items;
    }
  }
  for (const items of Object.values(spotStations)) items.sort((a, b) => a.distanceM - b.distanceM);

  const lines = lineRows
    .filter((line) => Number(line.e_status || 0) === 0)
    .map((line) => {
      const seenGroups = new Set();
      const orderedGroups = stationRows
        .filter((row) => String(row.line_cd) === String(line.line_cd))
        .sort((a, b) => Number(a.e_sort || a.station_cd) - Number(b.e_sort || b.station_cd))
        .map((row) => groups.get(String(row.station_g_cd || row.station_cd)))
        .filter(Boolean)
        .filter((group) => {
          if (seenGroups.has(group.groupCode)) return false;
          seenGroups.add(group.groupCode);
          return true;
        });
      const lineStations = orderedGroups.map((group) => ({
          name: group.name,
          kana: group.kana,
          prefecture: group.prefecture,
          pageSlug: pageCodes.has(group.groupCode) ? group.slug : null,
          nearbySpots: group.nearbySpots,
        }));
      const firstGroup = orderedGroups[0];
      const lastGroup = orderedGroups.at(-1);
      const isLoop = Boolean(firstGroup && lastGroup && (graph.get(firstGroup.groupCode) ?? []).some((edge) => edge.to === lastGroup.groupCode && edge.lineName === line.line_name));
      return {
        slug: String(line.line_cd),
        name: line.line_name,
        prefectures: [...new Set(lineStations.map((station) => station.prefecture))],
        isLoop,
        stations: lineStations,
      };
    })
    .filter((line) => line.stations.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(path.join(OUTPUT_DIR, "stations.json"), JSON.stringify(stations)),
    writeFile(path.join(OUTPUT_DIR, "lines.json"), JSON.stringify(lines)),
    writeFile(path.join(OUTPUT_DIR, "spot-stations.json"), JSON.stringify(spotStations)),
    writeFile(path.join(OUTPUT_DIR, "slugs.json"), `${JSON.stringify(slugMap, null, 2)}\n`),
  ]);
  console.log(`station data ok: ${stations.length} station pages, ${lines.length} line pages, ${spots.length} published spots`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
