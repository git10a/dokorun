import type { LineString } from "@/lib/types";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function lineStringToGpx(name: string, line: LineString) {
  if (line.type !== "LineString" || line.coordinates.length < 2) throw new Error("GPXに変換できるコース形状がありません");
  const points = line.coordinates.map(([lng, lat]) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("コース座標が不正です");
    return `      <trkpt lat="${lat}" lon="${lng}" />`;
  }).join("\n");
  const safeName = escapeXml(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="どこラン" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${safeName}</name></metadata>
  <trk>
    <name>${safeName}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}
