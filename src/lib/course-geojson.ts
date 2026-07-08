import { simplifyLine } from "@/lib/simplify";
import type { LineString } from "@/lib/types";

export function simplifyCourseGeojson(geojson: LineString | null): LineString | null {
  if (!geojson) return null;
  return { ...geojson, coordinates: simplifyLine(geojson.coordinates, 0.00005) };
}
