// 確認済みの周回GPXへ、周回路上の往復区間を加えて指定距離の大会参考GPXを作る。
// 使い方: npx tsx scripts/extend-loop-gpx.ts <base.gpx> <out.gpx> <target-km> <name>
import { readFileSync, writeFileSync } from "node:fs";
import { cumulativeDistances, pointAtDistance } from "../src/lib/gpx";
import { pointsToGpx } from "../src/lib/gpx-export";
import { parseGpxPoints } from "../src/lib/gpx-node";

const [basePath, outPath, targetText, ...nameParts] = process.argv.slice(2);
const targetM = Number(targetText) * 1000;
const name = nameParts.join(" ");
if (!basePath || !outPath || !Number.isFinite(targetM) || !name) {
  console.error("使い方: npx tsx scripts/extend-loop-gpx.ts <base.gpx> <out.gpx> <target-km> <name>");
  process.exit(1);
}

const points = parseGpxPoints(readFileSync(basePath, "utf8"));
const cumulative = cumulativeDistances(points);
const baseM = cumulative.at(-1)!;
const extensionM = (targetM - baseM) / 2;
if (extensionM <= 0 || extensionM >= baseM) throw new Error(`指定距離を作れません: base=${baseM} target=${targetM}`);

// 始点から extensionM 進んだ地点までを往復する
const spurEnd = cumulative.findIndex((distance) => distance >= extensionM);
const spur = [...points.slice(0, spurEnd), pointAtDistance(points, cumulative, extensionM)];
const output = [...points, ...spur.slice(1), ...spur.slice(0, -1).reverse()];
writeFileSync(outPath, pointsToGpx(name, output));
console.log(
  JSON.stringify({
    baseM: Math.round(baseM),
    targetM: Math.round(cumulativeDistances(output).at(-1)!),
    points: output.length,
    outPath,
  }),
);
