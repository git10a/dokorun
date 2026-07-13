import type { LineString } from "@/lib/types";
import { haversine, type GpxPoint } from "@/lib/gpx";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function lineStringToGpx(name: string, line: LineString) {
  if (line.type !== "LineString" || line.coordinates.length < 2) throw new Error("GPXに変換できるコース形状がありません");
  return pointsToGpx(name, line.coordinates.map(([lng, lat]) => ({ lat, lng, ele: null })));
}

export function rotateClosedLoopPoints(points: GpxPoint[], start: Pick<GpxPoint, "lat" | "lng">) {
  if (points.length < 3) throw new Error("始点を変更できる周回コースがありません");
  const isClosed = haversine(points[0], points[points.length - 1]) <= 5;
  if (!isClosed) throw new Error("始点を変更できるのは閉じた周回コースだけです");
  const body = points.slice(0, -1);
  const startIndex = body.reduce((best, point, index) => haversine(point, start) < haversine(body[best], start) ? index : best, 0);
  const rotated = [...body.slice(startIndex), ...body.slice(0, startIndex)];
  return [...rotated, rotated[0]];
}

export function pointsToGpx(name: string, points: GpxPoint[]) {
  if (points.length < 2) throw new Error("GPXに変換できるコース形状がありません");
  const pointXml = points.map(({ lat, lng, ele }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("コース座標が不正です");
    if (ele === null || !Number.isFinite(ele)) return `      <trkpt lat="${lat}" lon="${lng}" />`;
    return `      <trkpt lat="${lat}" lon="${lng}"><ele>${ele}</ele></trkpt>`;
  }).join("\n");
  const safeName = escapeXml(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="どこラン" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${safeName}</name></metadata>
  <trk>
    <name>${safeName}</name>
    <trkseg>
${pointXml}
    </trkseg>
  </trk>
</gpx>
`;
}
