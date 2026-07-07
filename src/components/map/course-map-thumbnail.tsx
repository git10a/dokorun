"use client";

import { useEffect, useRef } from "react";
import type { LineString } from "@/lib/types";

export function CourseMapThumbnail({
  lat,
  lng,
  geojson,
  name,
}: {
  lat: number;
  lng: number;
  geojson: LineString | null;
  name: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    let map: import("maplibre-gl").Map | undefined;
    let disposed = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || map) return;
      observer.disconnect();

      void import("maplibre-gl").then((maplibregl) => {
        if (disposed || !container.current) return;
        map = new maplibregl.Map({
          container: container.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [lng, lat],
          zoom: 13,
          interactive: false,
          attributionControl: false,
        });
        map.on("load", () => {
          if (!map) return;
          if (geojson?.coordinates.length) {
            map.addSource("course", { type: "geojson", data: geojson });
            map.addLayer({
              id: "course",
              type: "line",
              source: "course",
              paint: {
                "line-color": "#1A1A1A",
                "line-width": 4,
                "line-opacity": 0.9,
              },
            });
            const bounds = new maplibregl.LngLatBounds();
            geojson.coordinates.forEach((coordinate) => bounds.extend(coordinate));
            map.fitBounds(bounds, { padding: 18, maxZoom: 16, duration: 0 });
          }

          const marker = document.createElement("div");
          marker.className = "h-4 w-4 rounded-full border-[3px] border-white bg-[#2BA84A] shadow";
          new maplibregl.Marker({ element: marker }).setLngLat([lng, lat]).addTo(map);
        });
      });
    }, { rootMargin: "200px" });

    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      map?.remove();
    };
  }, [geojson, lat, lng]);

  return <div ref={container} className="h-full min-h-32 w-full bg-cream" role="img" aria-label={`${name}のコース地図`} />;
}
