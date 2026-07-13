import { XMLParser } from "fast-xml-parser";
import { gpxResultFromPoints, type GpxPoint, type GpxResult } from "@/lib/gpx";

type XmlNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function readPoint(value: Record<string, unknown>): GpxPoint | null {
  const lat = Number(value["@_lat"]);
  const lng = Number(value["@_lon"]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const rawEle = value.ele;
  return { lat, lng, ele: rawEle === undefined ? null : Number(rawEle) };
}

export function parseGpxPoints(xml: string): GpxPoint[] {
  let parsed: XmlNode;
  try {
    parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  } catch {
    throw new Error("GPXファイルを解析できませんでした");
  }
  const gpx = parsed.gpx;
  if (!gpx || typeof gpx !== "object" || Array.isArray(gpx)) throw new Error("GPXファイルを解析できませんでした");
  const gpxNode = gpx as XmlNode;
  const trackPoints = asArray(gpxNode.trk).flatMap((track) =>
    track && typeof track === "object" && !Array.isArray(track)
      ? asArray((track as XmlNode).trkseg).flatMap((segment) => segment && typeof segment === "object" && !Array.isArray(segment) ? asArray((segment as XmlNode).trkpt) : [])
      : [],
  );
  const routePoints = asArray(gpxNode.rte).flatMap((route) => route && typeof route === "object" && !Array.isArray(route) ? asArray((route as XmlNode).rtept) : []);
  const points = (trackPoints.length ? trackPoints : routePoints)
    .map((point) => point && typeof point === "object" && !Array.isArray(point) ? readPoint(point as XmlNode) : null)
    .filter((point): point is GpxPoint => Boolean(point));
  if (points.length < 2) throw new Error("GPXファイルを解析できませんでした");
  return points;
}

export function parseGpx(xml: string): GpxResult {
  return gpxResultFromPoints(parseGpxPoints(xml));
}
