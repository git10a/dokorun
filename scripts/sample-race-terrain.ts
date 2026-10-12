import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseGpxPoints } from "../src/lib/gpx-node";
import { raceElevationFromPoints, elevationPointAtDistance, type RaceElevation } from "../src/lib/race-elevation";

// Explicit, offline preparation. Fetches only public GSI tiles, never at page-view time.
// Specification: https://maps.gsi.go.jp/development/demtile.html
async function main() {
  const slug = process.argv[2];
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Usage: npm run race-elevation:terrain -- <race-slug>");
  const xml = readFileSync(`public/race-gpx/${slug}.gpx`, "utf8");
  const route = raceElevationFromPoints(parseGpxPoints(xml));
  const reason = process.argv.includes("--unverified-elevation") ? "GPX elevation has suspicious peaks; display terrain estimate while keeping the original GPX unchanged" : "GPX has no elevation";
  if (route.points.some((point) => point.elevationM !== null) && !process.argv.includes("--unverified-elevation")) throw new Error("This GPX already has elevation. Review its provenance before replacing it; use --unverified-elevation for a terrain-only display override.");
  const total = route.points.at(-1)!.distanceM;
  const count = Math.ceil(total / 50);
  const cache = new Map<string, string[][] | null>();
  const usedTiles = new Set<string>();
  async function sample(lat: number, lng: number): Promise<number | null> {
    const z = 14;
    const px = (lng + 180) / 360 * 2 ** z * 256;
    const radians = lat * Math.PI / 180;
    const py = (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * 2 ** z * 256;
    const tileX = Math.floor(px / 256);
    const tileY = Math.floor(py / 256);
    for (const layer of ["dem5a", "dem5b", "dem"]) {
      const url = `https://cyberjapandata.gsi.go.jp/xyz/${layer}/${z}/${tileX}/${tileY}.txt`;
      if (!cache.has(url)) {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (response.status === 404) cache.set(url, null);
        else {
          if (!response.ok) throw new Error(`GSI: ${response.status}`);
          const rows = (await response.text()).trim().split(/\r?\n/).map((row) => row.split(","));
          if (rows.length !== 256 || rows.some((row) => row.length !== 256)) throw new Error("Invalid GSI tile");
          cache.set(url, rows);
        }
      }
      const cell = cache.get(url)?.[Math.floor(py) % 256]?.[Math.floor(px) % 256];
      if (cell !== undefined && cell.trim() !== "" && cell !== "e" && Number.isFinite(Number(cell))) {
        usedTiles.add(url);
        return Number(cell);
      }
    }
    return null;
  }
  const profile: RaceElevation = { version: 1, source: "gsi", points: [] };
  for (let index = 0; index <= count; index++) {
    const point = elevationPointAtDistance(route.points, index / count * total)!;
    profile.points.push({ ...point, distanceM: Math.round(point.distanceM * 100) / 100,
      lat: Number(point.lat.toFixed(7)), lng: Number(point.lng.toFixed(7)), elevationM: await sample(point.lat, point.lng) });
  }
  if (!profile.points.some((point) => point.elevationM !== null)) throw new Error("No terrain elevations found");
  mkdirSync("data/race-elevation", { recursive: true });
  writeFileSync(`data/race-elevation/${slug}.json`, JSON.stringify({
    gpxSha256: createHash("sha256").update(xml).digest("hex"), fetchedAt: new Date().toISOString(),
    sourceUrl: "https://maps.gsi.go.jp/development/ichiran.html", attribution: "国土地理院の標高タイルを加工して作成",
    reason, samplingIntervalM: 50, zoom: 14, method: "nearest pixel; DEM5A, DEM5B, DEM10B fallback; missing values retained as null",
    tiles: [...usedTiles], profile,
  }, null, 2) + "\n");
  console.log(`${slug}: ${profile.points.length} samples, ${usedTiles.size} tiles, ${profile.points.filter((point) => point.elevationM === null).length} missing`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
