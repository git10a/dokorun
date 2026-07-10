// 大会公式サイトのGoogle My Maps埋め込みから取得したKMLをGPXに変換する。
// 使い方: node scripts/kml-to-gpx.mjs <kmlファイル> <出力gpx> --name <LineString名の部分一致> [--blocks 0r,1r]
//   KMLの取得: curl -sL -A "Mozilla/5.0" "https://www.google.com/maps/d/kml?mid=<MID>&forcekml=1" -o course.kml
//   (MIDは公式サイトの埋め込み google.com/maps/d/embed?mid=... から)
// MultiGeometryで走路が複数ブロックに分かれている場合は、まず--blocksなしで実行して
// 各ブロックの端点を確認し、連結順と向きを --blocks で指定する(例: 0r,1r = block0を逆順→block1を逆順)。
// 変換後は必ず npm run gpx:check で距離・形状を検証すること。
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const nameIndex = args.indexOf("--name");
const blocksIndex = args.indexOf("--blocks");
const lineName = nameIndex >= 0 ? args[nameIndex + 1] : null;
const blocksSpec = blocksIndex >= 0 ? args[blocksIndex + 1] : null;
const positional = args.filter((arg, i) => !arg.startsWith("--") && i !== nameIndex + 1 && i !== blocksIndex + 1);
const [kmlPath, outPath] = positional;
if (!kmlPath || !outPath || !lineName) {
  console.error("使い方: node scripts/kml-to-gpx.mjs <kmlファイル> <出力gpx> --name <LineString名の部分一致> [--blocks 0r,1r]");
  process.exit(1);
}

const kml = readFileSync(kmlPath, "utf8");
const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) ?? [];
const lines = placemarks
  .map((pm) => ({ pm, name: (pm.match(/<name>([\s\S]*?)<\/name>/) ?? [])[1] ?? "" }))
  .filter(({ pm, name }) => pm.includes("<LineString>") && name.includes(lineName));
if (lines.length !== 1) {
  console.error(`LineString "${lineName}" が一意に特定できません(${lines.length}件)。候補:`);
  for (const { pm, name } of placemarks.map((pm) => ({ pm, name: (pm.match(/<name>([\s\S]*?)<\/name>/) ?? [])[1] }))) {
    if (pm.includes("<LineString>")) console.error(`  - ${JSON.stringify(name)}`);
  }
  process.exit(1);
}

const blocks = (lines[0].pm.match(/<coordinates>[\s\S]*?<\/coordinates>/g) ?? []).map((block) =>
  block.replace(/<\/?coordinates>/g, "").trim().split(/\s+/).map((tuple) => tuple.split(",").map(Number)),
);
for (const [index, block] of blocks.entries()) {
  console.error(`block ${index}: ${block.length}pts  first=[${block[0].slice(0, 2)}]  last=[${block[block.length - 1].slice(0, 2)}]`);
}

let path;
if (blocks.length === 1 && !blocksSpec) {
  path = blocks[0];
} else if (blocksSpec) {
  path = [];
  for (const spec of blocksSpec.split(",")) {
    const reverse = spec.endsWith("r");
    const index = Number(reverse ? spec.slice(0, -1) : spec);
    const block = reverse ? [...blocks[index]].reverse() : blocks[index];
    // 連結点の重複を落とす
    path.push(...(path.length ? block.slice(1) : block));
  }
} else {
  console.error("MultiGeometryです。上記の端点を見て --blocks で連結順と向きを指定してください");
  process.exit(1);
}

const trkpts = path.map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`).join("\n");
const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="dokorun official-coursemap" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${lineName} (公式My Maps由来)</name><trkseg>\n${trkpts}\n</trkseg></trk>\n</gpx>\n`;
writeFileSync(outPath, gpx);
console.log(JSON.stringify({ points: path.length, first: path[0].slice(0, 2), last: path[path.length - 1].slice(0, 2), outPath }));
