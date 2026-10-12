// Overpass API の公園内の道(way+node のJSON)から、目標距離に最も近い周回路を1つ選んでGPXにする。
// 使い方: npx tsx scripts/extract-osm-park-cycle.ts <overpass.json> <out.gpx> <target-m>
import { readFileSync, writeFileSync } from "node:fs";
import { haversine } from "../src/lib/gpx";
import { pointsToGpx } from "../src/lib/gpx-export";

type OsmNode = { type: "node"; id: number; lat: number; lon: number };
type OsmWay = { type: "way"; id: number; nodes: number[] };

const [input, output, targetText] = process.argv.slice(2);
const target = Number(targetText);
const data = JSON.parse(readFileSync(input, "utf8")) as { elements: (OsmNode | OsmWay)[] };
const nodes = new Map(data.elements.filter((e): e is OsmNode => e.type === "node").map((e) => [e.id, e]));
const adjacency = new Map<number, Set<number>>();
for (const way of data.elements.filter((e): e is OsmWay => e.type === "way")) {
  for (let i = 1; i < way.nodes.length; i += 1) {
    const a = way.nodes[i - 1];
    const b = way.nodes[i];
    if (!nodes.has(a) || !nodes.has(b)) continue;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }
}

const cycles: number[][] = [];
const seen = new Set<number>();
for (const root of adjacency.keys()) {
  if (seen.has(root)) continue;
  const predecessor = new Map<number, number>([[root, root]]);
  const used = new Map<number, Set<number>>();
  const stack = [root];
  seen.add(root);
  while (stack.length) {
    const current = stack.pop()!;
    const currentUsed = used.get(current) ?? new Set();
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!seen.has(neighbor)) {
        predecessor.set(neighbor, current);
        seen.add(neighbor);
        stack.push(neighbor);
      } else if (neighbor !== predecessor.get(current) && !currentUsed.has(neighbor)) {
        const neighborUsed = used.get(neighbor) ?? new Set();
        if (!neighborUsed.has(current)) {
          const cycle = [neighbor, current];
          let parent = predecessor.get(current)!;
          while (!cycle.includes(parent)) {
            cycle.push(parent);
            parent = predecessor.get(parent)!;
          }
          cycle.push(parent);
          cycles.push(cycle);
        }
      }
      currentUsed.add(neighbor);
    }
    used.set(current, currentUsed);
  }
}

const point = (id: number) => ({ lat: nodes.get(id)!.lat, lng: nodes.get(id)!.lon });

const candidates = cycles.map((cycle) => ({
  cycle: [...cycle, cycle[0]],
  distanceM:
    cycle.reduce((sum, id, index) => sum + (index ? haversine(point(cycle[index - 1]), point(id)) : 0), 0) +
    haversine(point(cycle.at(-1)!), point(cycle[0])),
}));
const selected = candidates.sort((a, b) => Math.abs(a.distanceM - target) - Math.abs(b.distanceM - target))[0];
writeFileSync(
  output,
  pointsToGpx(
    "Representative park loop",
    selected.cycle.map((id) => ({ ...point(id), ele: null })),
  ),
);
console.log(JSON.stringify({ output, distanceM: Math.round(selected.distanceM), points: selected.cycle.length }));
