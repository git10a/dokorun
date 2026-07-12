import { readFileSync, writeFileSync } from "node:fs";

const [input, output, targetText] = process.argv.slice(2);
const target = Number(targetText);
const data = JSON.parse(readFileSync(input, "utf8"));
const nodes = new Map(data.elements.filter((e) => e.type === "node").map((e) => [e.id, e]));
const adjacency = new Map();
for (const way of data.elements.filter((e) => e.type === "way")) {
  for (let i = 1; i < way.nodes.length; i += 1) {
    const a = way.nodes[i - 1];
    const b = way.nodes[i];
    if (!nodes.has(a) || !nodes.has(b)) continue;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }
}

const cycles = [];
const seen = new Set();
for (const root of adjacency.keys()) {
  if (seen.has(root)) continue;
  const predecessor = new Map([[root, root]]);
  const used = new Map();
  const stack = [root];
  seen.add(root);
  while (stack.length) {
    const current = stack.pop();
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
          let parent = predecessor.get(current);
          while (!cycle.includes(parent)) {
            cycle.push(parent);
            parent = predecessor.get(parent);
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

function distance(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(value));
}

const candidates = cycles.map((cycle) => ({
  cycle: [...cycle, cycle[0]],
  distanceM: cycle.reduce((sum, id, index) => sum + (index ? distance(nodes.get(cycle[index - 1]), nodes.get(id)) : 0), 0)
    + distance(nodes.get(cycle.at(-1)), nodes.get(cycle[0])),
}));
const selected = candidates.sort((a, b) => Math.abs(a.distanceM - target) - Math.abs(b.distanceM - target))[0];
const trkpts = selected.cycle.map((id) => {
  const node = nodes.get(id);
  return `      <trkpt lat="${node.lat}" lon="${node.lon}"></trkpt>`;
}).join("\n");
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dokorun OSM cycle extraction" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Representative park loop</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>
`;
writeFileSync(output, gpx);
console.log(JSON.stringify({ output, distanceM: Math.round(selected.distanceM), points: selected.cycle.length }));
