"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { addPoiEmphasis } from "./poi-emphasis";
import type { LineString } from "@/lib/types";

export function CourseMap({ lat, lng, geojson, highlightedPoint, className = "h-[340px]" }: { lat: number; lng: number; geojson: LineString | null; name?: string; highlightedPoint?: [number, number] | null; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const selectPoint = useRef<((point: [number, number] | null) => void) | null>(null);
  const latestPoint = useRef(highlightedPoint);
  useEffect(() => {
    latestPoint.current = highlightedPoint;
    selectPoint.current?.(highlightedPoint ?? null);
  }, [highlightedPoint]);
  useEffect(() => {
    if (!container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let disposed = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;
      map = new maplibregl.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [lng, lat], zoom: 13 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map || disposed) return;
        void addPoiEmphasis(map);
        const bounds = new maplibregl.LngLatBounds();
        if (geojson) {
          map.addSource("course", { type: "geojson", data: geojson });
          map.addLayer({ id: "course", type: "line", source: "course", paint: { "line-color": "#1A1A1A", "line-width": 4, "line-opacity": 0.85 } });
          geojson.coordinates.forEach((coordinate) => bounds.extend(coordinate));
          map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
        }
        const marker = document.createElement("div");
        marker.className = "h-5 w-5 rounded-full border-[3px] border-white bg-[#2BA84A] shadow";
        new maplibregl.Marker({ element: marker }).setLngLat([lng, lat]).addTo(map);
        let selectedMarker: import("maplibre-gl").Marker | undefined;
        selectPoint.current = (point) => {
          if (!map) return;
          if (point) {
            if (!selectedMarker) {
              selectedMarker = new maplibregl.Marker({ color: "#FFD900" });
              selectedMarker.getElement().setAttribute("aria-label", "選択したコース地点");
              selectedMarker.getElement().setAttribute("role", "img");
            }
            selectedMarker.setLngLat(point).addTo(map);
            // Retain the map instance while scrubbing, with no animation lag behind the finger.
            map.jumpTo({ center: point, zoom: Math.max(map.getZoom(), 14) });
          } else {
            selectedMarker?.remove();
            if (geojson) map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
          }
        };
        if (latestPoint.current) selectPoint.current(latestPoint.current);
      });
    });
    return () => { disposed = true; selectPoint.current = null; map?.remove(); };
  }, [geojson, lat, lng]);
  return <div ref={container} className={`maplibregl-map ${className} w-full overflow-hidden rounded-2xl border border-line bg-cream`} aria-label="コース地図" />;
}
