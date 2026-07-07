export type Coordinate = [number, number];

export type TilePlacement = {
  x: number;
  y: number;
  z: number;
  left: number;
  top: number;
  size: number;
};

export type StaticMapView = {
  zoom: number;
  tiles: TilePlacement[];
  project: (coord: Coordinate) => [number, number];
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 17;
const FALLBACK_ZOOM = 14;

function worldX(lng: number) {
  return (lng + 180) / 360;
}

function worldY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

export function computeStaticMapView({ coords, center, width, height, devicePixelRatio = 1, padding = 16 }: {
  coords: Coordinate[];
  center?: Coordinate;
  width: number;
  height: number;
  devicePixelRatio?: number;
  padding?: number;
}): StaticMapView | null {
  if (width <= 0 || height <= 0) return null;
  const anchors = coords.length ? coords : center ? [center] : [];
  if (!anchors.length) return null;

  const xs = anchors.map(([lng]) => worldX(lng));
  const ys = anchors.map(([, lat]) => worldY(lat));
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const innerWidth = Math.max(width - padding * 2, 16);
  const innerHeight = Math.max(height - padding * 2, 16);
  const fitZoom = Math.min(
    spanX > 0 ? Math.log2(innerWidth / (spanX * TILE_SIZE)) : Infinity,
    spanY > 0 ? Math.log2(innerHeight / (spanY * TILE_SIZE)) : Infinity,
  );
  const displayZoom = Math.min(Math.max(fitZoom === Infinity ? FALLBACK_ZOOM : fitZoom, MIN_ZOOM), MAX_ZOOM);

  // Fetch tiles one level deeper on high-density screens and downscale so thumbnails stay sharp.
  // 密度は1.5で頭打ちにし、さらに1枚あたりのタイル数を抑えて転送量を優先する。
  const density = Math.min(Math.max(devicePixelRatio, 1), 1.5);
  let tileZoom = Math.min(Math.max(Math.ceil(displayZoom + Math.log2(density)), MIN_ZOOM), MAX_ZOOM);
  const gridCount = (zoom: number) => {
    const tileCss = TILE_SIZE * 2 ** (displayZoom - zoom);
    return (Math.ceil(width / tileCss) + 1) * (Math.ceil(height / tileCss) + 1);
  };
  const noUpscaleZoom = Math.min(Math.max(Math.ceil(displayZoom), MIN_ZOOM), MAX_ZOOM);
  while (tileZoom > noUpscaleZoom && gridCount(tileZoom) > 12) tileZoom -= 1;
  const scale = 2 ** (displayZoom - tileZoom);
  const worldSize = TILE_SIZE * 2 ** tileZoom;

  const centerX = ((Math.max(...xs) + Math.min(...xs)) / 2) * worldSize;
  const centerY = ((Math.max(...ys) + Math.min(...ys)) / 2) * worldSize;
  const originX = centerX - width / 2 / scale;
  const originY = centerY - height / 2 / scale;

  const maxTileIndex = 2 ** tileZoom - 1;
  const tiles: TilePlacement[] = [];
  const txMin = Math.floor(originX / TILE_SIZE);
  const txMax = Math.floor((originX + width / scale) / TILE_SIZE);
  const tyMin = Math.max(Math.floor(originY / TILE_SIZE), 0);
  const tyMax = Math.min(Math.floor((originY + height / scale) / TILE_SIZE), maxTileIndex);
  for (let ty = tyMin; ty <= tyMax; ty += 1) {
    for (let tx = txMin; tx <= txMax; tx += 1) {
      tiles.push({
        x: ((tx % (maxTileIndex + 1)) + maxTileIndex + 1) % (maxTileIndex + 1),
        y: ty,
        z: tileZoom,
        left: (tx * TILE_SIZE - originX) * scale,
        top: (ty * TILE_SIZE - originY) * scale,
        size: TILE_SIZE * scale,
      });
    }
  }

  return {
    zoom: tileZoom,
    tiles,
    project: ([lng, lat]) => [(worldX(lng) * worldSize - originX) * scale, (worldY(lat) * worldSize - originY) * scale],
  };
}
