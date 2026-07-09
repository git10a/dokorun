import type { Map as MapLibreMap, FilterSpecification } from "maplibre-gl";

// OpenFreeMap(OpenMapTiles)のpoiレイヤーから、ランナーに重要なPOIを大きなアイコンで強調表示する。
// 駅はz13タイルから、コンビニ・公園・トイレはz14タイルからしか収録されないため、minzoomはそれに合わせる。

const ICON_BADGES: Record<string, { color: string; glyph: string }> = {
  "poi-emph-station": {
    color: "#1A7DC4",
    glyph: '<rect x="12" y="7" width="24" height="25" rx="5" fill="#fff"/><rect x="16" y="12" width="16" height="8" rx="2" fill="#1A7DC4"/><circle cx="19" cy="26" r="2.6" fill="#1A7DC4"/><circle cx="29" cy="26" r="2.6" fill="#1A7DC4"/><path d="M16 33 L12 39 M32 33 L36 39" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>',
  },
  "poi-emph-convenience": {
    color: "#F59E0B",
    glyph: '<path d="M10 11 h28 l3 8 h-34 z" fill="#fff"/><rect x="13" y="21" width="22" height="16" fill="#fff"/><rect x="26" y="26" width="6" height="11" rx="1" fill="#F59E0B"/><rect x="16" y="26" width="7" height="6" rx="1" fill="#F59E0B"/>',
  },
  "poi-emph-park": {
    color: "#2BA84A",
    glyph: '<circle cx="24" cy="18" r="10" fill="#fff"/><circle cx="17" cy="23" r="6.5" fill="#fff"/><circle cx="31" cy="23" r="6.5" fill="#fff"/><rect x="21.8" y="24" width="4.4" height="15" rx="2" fill="#fff"/>',
  },
  "poi-emph-toilets": {
    color: "#8B5CF6",
    glyph: '<text x="24" y="30" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" fill="#fff" text-anchor="middle">WC</text>',
  },
  "poi-emph-water": {
    color: "#0EA5E9",
    glyph: '<path d="M24 9 C24 9 13 22 13 29 a11 11 0 0 0 22 0 C35 22 24 9 24 9 z" fill="#fff"/><path d="M19 29 a5 5 0 0 0 5 5" stroke="#0EA5E9" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  },
};

const EMPHASIZED_SUBCLASSES = ["station", "subway", "convenience", "park", "toilets", "drinking_water"];

const NAME_JA: unknown = ["coalesce", ["get", "name:ja"], ["get", "name"]];

function loadBadgeImage(name: string): Promise<HTMLImageElement> {
  const { color, glyph } = ICON_BADGES[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="21" fill="${color}" stroke="#fff" stroke-width="3"/>${glyph}</svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image(48, 48);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function addPoiEmphasis(map: MapLibreMap): Promise<void> {
  const images = await Promise.all(
    Object.keys(ICON_BADGES).map(async (name) => [name, await loadBadgeImage(name)] as const),
  );
  // 画像ロード中にmapが破棄されていたら何もしない
  try {
    if (!map.getStyle()) return;
  } catch {
    return;
  }
  for (const [name, img] of images) {
    if (!map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
  }

  // デフォルトスタイル側の小さいPOI表示と二重にならないよう、対象subclassを既存レイヤーから除外する
  const exclude: FilterSpecification = ["!", ["match", ["get", "subclass"], EMPHASIZED_SUBCLASSES, true, false]] as unknown as FilterSpecification;
  for (const layerId of ["poi_r1", "poi_r7", "poi_r20", "poi_transit"]) {
    const layer = map.getLayer(layerId);
    if (!layer) continue;
    const current = map.getFilter(layerId);
    map.setFilter(layerId, (current ? ["all", current, exclude] : exclude) as FilterSpecification);
  }

  map.addLayer({
    id: "poi-emph-rail",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 12,
    filter: ["all", ["==", ["get", "class"], "railway"], ["match", ["get", "subclass"], ["station", "subway"], true, false]],
    layout: {
      "icon-image": "poi-emph-station",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 1.15],
      "text-field": NAME_JA as string,
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 12, 11, 16, 13],
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: {
      "text-color": "#1A5E93",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.6,
    },
  });

  map.addLayer({
    id: "poi-emph-amenity",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 14,
    filter: ["match", ["get", "subclass"], ["convenience", "park", "toilets", "drinking_water"], true, false],
    layout: {
      "icon-image": ["match", ["get", "subclass"], "convenience", "poi-emph-convenience", "park", "poi-emph-park", "drinking_water", "poi-emph-water", "poi-emph-toilets"],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.72, 17, 1.05],
      "text-field": ["case", ["==", ["get", "subclass"], "park"], NAME_JA as string, ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.3],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: {
      "text-color": "#1E7A38",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.6,
    },
  });
}
