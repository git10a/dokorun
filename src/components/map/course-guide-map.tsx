"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { loadMaplibre } from "./load-maplibre";
import { addPoiEmphasis } from "./poi-emphasis";
import type { LineString } from "@/lib/types";
import type { CourseGuideStartPoint } from "@/lib/course-guides";

export function CourseGuideMap({
  geojson,
  startPoints,
  selectedStartId,
}: {
  geojson: LineString;
  startPoints: CourseGuideStartPoint[];
  selectedStartId: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef<import("maplibre-gl").Marker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    void loadMaplibre().then((maplibregl) => {
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
        setReady(true);
      });
    });
    return () => {
      disposed = true;
      markers.current.forEach((marker) => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [geojson]);

  useEffect(() => {
    if (!ready || !map.current) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    void loadMaplibre().then((maplibregl) => {
      if (!map.current) return;
      startPoints.forEach((start) => {
        const selected = start.id === selectedStartId;
        const element = document.createElement("div");
        element.className = `grid size-7 place-items-center rounded-full border-[3px] border-white text-[10px] font-black shadow ${selected ? "bg-brand text-ink" : "bg-paper text-ink ring-2 ring-ink"}`;
        element.textContent = "S";
        element.title = `${start.name}${selected ? "（選択中）" : ""}`;
        markers.current.push(
          new maplibregl.Marker({ element }).setLngLat([start.routeLng, start.routeLat]).addTo(map.current!),
        );
      });
    });
  }, [ready, selectedStartId, startPoints]);

  return (
    <div
      ref={container}
      className="h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-cream sm:h-[400px]"
      aria-label="コースとスタート地点の地図"
    />
  );
}
