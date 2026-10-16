"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { addPoiEmphasis } from "./poi-emphasis";
import { loadMapLibre } from "./load-maplibre";
import type { LineString } from "@/lib/types";
import type { CourseGuideStartPoint } from "@/lib/course-guides";

export function CourseGuideMap({
  geojson,
  startPoints,
  selectedStartId,
  highlightedPoint,
}: {
  geojson: LineString;
  startPoints: CourseGuideStartPoint[];
  selectedStartId: string;
  highlightedPoint?: [number, number] | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef<import("maplibre-gl").Marker[]>([]);
  const [ready, setReady] = useState(false);
  const selectPoint = useRef<((point: [number, number] | null) => void) | null>(null);
  const latestPoint = useRef(highlightedPoint);
  useEffect(() => {
    latestPoint.current = highlightedPoint;
    selectPoint.current?.(highlightedPoint ?? null);
  }, [highlightedPoint]);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    void loadMapLibre().then((maplibregl) => {
      if (disposed || !container.current) return;
      const instance = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: geojson.coordinates[0],
        zoom: 13,
      });
      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      instance.on("load", () => {
        if (disposed) return;
        void addPoiEmphasis(instance);
        instance.addSource("course", { type: "geojson", data: geojson });
        instance.addLayer({
          id: "course",
          type: "line",
          source: "course",
          paint: { "line-color": "#1A1A1A", "line-width": 4, "line-opacity": 0.85 },
        });
        const bounds = new maplibregl.LngLatBounds();
        geojson.coordinates.forEach((coordinate) => bounds.extend(coordinate));
        instance.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
        let selectedMarker: import("maplibre-gl").Marker | null = null;
        selectPoint.current = (point) => {
          if (disposed) return;
          if (!point) {
            if (selectedMarker) {
              selectedMarker.remove();
              selectedMarker = null;
              instance.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
            }
            return;
          }
          if (!selectedMarker) {
            const element = document.createElement("div");
            element.className = "size-5 rounded-full border-[3px] border-white bg-[#FACC15] shadow-[0_0_0_3px_#1A1A1A]";
            element.style.zIndex = "10";
            element.setAttribute("role", "img");
            element.setAttribute("aria-label", "選択したコース地点");
            selectedMarker = new maplibregl.Marker({ element }).setLngLat(point).addTo(instance);
          } else selectedMarker.setLngLat(point);
          if (!instance.getBounds().contains(point)) instance.jumpTo({ center: point });
        };
        selectPoint.current(latestPoint.current ?? null);
        setReady(true);
      });
    });
    return () => {
      disposed = true;
      selectPoint.current = null;
      markers.current.forEach((marker) => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [geojson]);

  useEffect(() => {
    if (!ready || !map.current) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const instance = map.current;
    const created: import("maplibre-gl").Marker[] = [];
    let disposed = false;
    void loadMapLibre().then((maplibregl) => {
      if (disposed || map.current !== instance) return;
      startPoints.forEach((start) => {
        const selected = start.id === selectedStartId;
        const element = document.createElement("div");
        element.className = `grid size-7 place-items-center rounded-full border-[3px] border-white text-[10px] font-black shadow ${selected ? "bg-brand text-ink" : "bg-paper text-ink ring-2 ring-ink"}`;
        element.textContent = "S";
        element.title = `${start.name}${selected ? "（選択中）" : ""}`;
        created.push(new maplibregl.Marker({ element }).setLngLat([start.routeLng, start.routeLat]).addTo(instance));
      });
      markers.current = created;
    });
    return () => {
      disposed = true;
      created.forEach((marker) => marker.remove());
    };
  }, [ready, selectedStartId, startPoints]);

  return (
    <div
      ref={container}
      className="h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-cream sm:h-[400px]"
      aria-label="コースとスタート地点の地図"
    />
  );
}
