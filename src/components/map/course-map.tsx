"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { CourseShape } from "@/components/course-shape";
import type { LineString } from "@/lib/types";

export function CourseMap({ lat, lng, geojson, name = "コース" }: { lat: number; lng: number; geojson: LineString | null; name?: string }) {
  const [active, setActive] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let disposed = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;
      map = new maplibregl.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [lng, lat], zoom: 13 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map) return;
        if (geojson) {
          map.addSource("course", { type: "geojson", data: geojson });
          map.addLayer({ id: "course", type: "line", source: "course", paint: { "line-color": "#1A1A1A", "line-width": 4, "line-opacity": 0.85 } });
          const bounds = new maplibregl.LngLatBounds();
          geojson.coordinates.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
        }
        const marker = document.createElement("div");
        marker.className = "h-5 w-5 rounded-full border-[3px] border-white bg-[#2BA84A] shadow";
        new maplibregl.Marker({ element: marker }).setLngLat([lng, lat]).addTo(map);
      });
    });
    return () => { disposed = true; map?.remove(); };
  }, [active, geojson, lat, lng]);
  if (!active) {
    return (
      <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-line bg-cream">
        <CourseShape coords={geojson?.coordinates ?? []} name={name} className="h-full w-full" />
        <button type="button" onClick={() => setActive(true)} className="absolute inset-x-0 bottom-5 mx-auto w-fit rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg">地図を操作する</button>
      </div>
    );
  }
  return <div ref={container} className="h-[340px] w-full overflow-hidden rounded-2xl border border-line" aria-label="コース地図" />;
}
