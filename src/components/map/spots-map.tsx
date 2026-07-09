"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { addPoiEmphasis } from "./poi-emphasis";
import type { MapSpot } from "@/lib/types";

export function SpotsMap({ spots }: { spots: MapSpot[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current || !spots.length) return;
    let map: import("maplibre-gl").Map | undefined;
    let disposed = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;
      map = new maplibregl.Map({ container: container.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [spots[0].lng, spots[0].lat], zoom: 10 });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => { if (map) void addPoiEmphasis(map); });
      const bounds = new maplibregl.LngLatBounds();
      spots.forEach((spot) => {
        bounds.extend([spot.lng, spot.lat]);
        const marker = document.createElement("button");
        marker.className = "size-5 rounded-full border-2 border-ink bg-brand shadow";
        marker.setAttribute("aria-label", spot.name);
        const popup = new maplibregl.Popup({ offset: 14 }).setHTML(`<strong>${spot.name}</strong><br><span>${(spot.distanceM / 1000).toFixed(1)}km</span><br><a href="/spots/${spot.slug}" style="color:#1A7DC4;text-decoration:underline">詳細を見る</a>`);
        new maplibregl.Marker({ element: marker }).setLngLat([spot.lng, spot.lat]).setPopup(popup).addTo(map!);
      });
      if (spots.length > 1) map.fitBounds(bounds, { padding: 40, maxZoom: 13 });
    });
    return () => { disposed = true; map?.remove(); };
  }, [spots]);
  if (!spots.length) return <div className="grid h-full min-h-80 place-items-center bg-cream text-sm text-sub">地図に表示できるスポットがありません</div>;
  return <div ref={container} className="h-full min-h-[420px] w-full" aria-label="検索結果の地図" />;
}
