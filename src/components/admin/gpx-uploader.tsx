"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { CourseMap } from "@/components/map/course-map";
import type { GpxResult } from "@/lib/gpx";
import type { LineString } from "@/lib/types";

function setInput(id: string, value: string) {
  const input = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (input) { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); }
}

export function GpxUploader({ initialGeojson, initialLat, initialLng }: { initialGeojson: LineString | null; initialLat: number; initialLng: number }) {
  const [geojson, setGeojson] = useState<LineString | null>(initialGeojson);
  const [point, setPoint] = useState({ lat: initialLat, lng: initialLng });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function parse(file: File) {
    setLoading(true); setMessage("");
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/gpx/parse", { method: "POST", body });
    const result = await response.json() as GpxResult & { error?: string };
    setLoading(false);
    if (!response.ok) { setMessage(result.error ?? "解析できませんでした"); return; }
    setGeojson(result.geojson); setPoint(result.startPoint); setMessage("GPXを解析してコース情報を自動入力しました");
    setInput("lat", String(result.startPoint.lat)); setInput("lng", String(result.startPoint.lng)); setInput("distanceKm", (result.distanceM / 1000).toFixed(3)); setInput("elevationGainM", result.elevationGainM === null ? "" : String(result.elevationGainM)); setInput("courseType", result.suggestedCourseType); setInput("geojson", JSON.stringify(result.geojson));
  }
  return <div className="space-y-4"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-cream px-5 py-8 font-bold hover:border-brand-dark"><Upload size={20} />{loading ? "解析中…" : "GPXファイルを選択"}<input type="file" accept=".gpx,application/gpx+xml" className="sr-only" disabled={loading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void parse(file); }} /></label>{message && <p className={`text-sm font-bold ${message.includes("自動入力") ? "text-[#207235]" : "text-danger"}`}>{message}</p>}<input id="geojson" type="hidden" name="geojson" defaultValue={initialGeojson ? JSON.stringify(initialGeojson) : ""} />{geojson && <CourseMap lat={point.lat} lng={point.lng} geojson={geojson} />}</div>;
}
