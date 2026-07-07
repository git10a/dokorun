"use client";

import { useEffect, useRef, useState } from "react";
import { computeStaticMapView, type Coordinate } from "@/lib/static-map";

// 地理院タイル(淡色地図)。利用規約上、出典「地理院タイル」の表示が必要。
const TILE_URL = (z: number, x: number, y: number) => `https://cyberjapandata.gsi.go.jp/xyz/pale/${z}/${x}/${y}.png`;

export function StaticCourseMap({ coords, lat, lng, name, className }: {
  coords: Coordinate[];
  lat?: number;
  lng?: number;
  name: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number; dpr: number } | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight, dpr: window.devicePixelRatio || 1 };
      setBox((prev) => (prev && prev.width === next.width && prev.height === next.height && prev.dpr === next.dpr ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const center: Coordinate | undefined = lng !== undefined && lat !== undefined ? [lng, lat] : coords[0];
  const view = box ? computeStaticMapView({ coords, center, width: box.width, height: box.height, devicePixelRatio: box.dpr }) : null;
  const markerCoord = coords.length ? coords[0] : center;
  const marker = view && markerCoord ? view.project(markerCoord) : null;
  const points = view ? coords.map((coord) => view.project(coord).map((value) => value.toFixed(1)).join(",")).join(" ") : "";

  return (
    <div ref={container} className={`relative overflow-hidden bg-cream ${className ?? ""}`} role="img" aria-label={`${name}のコース地図`}>
      {view && (
        <>
          {view.tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element -- タイルはCDN直配信が最軽量。next/imageの最適化を挟まない
            <img
              key={`${tile.z}/${tile.x}/${tile.y}`}
              src={TILE_URL(tile.z, tile.x, tile.y)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left: tile.left, top: tile.top, width: tile.size, height: tile.size }}
            />
          ))}
          <svg viewBox={`0 0 ${box!.width} ${box!.height}`} className="absolute inset-0 h-full w-full">
            {coords.length > 1 && <polyline points={points} fill="none" stroke="#FFFFFF" strokeWidth="5" strokeOpacity="0.7" strokeLinejoin="round" strokeLinecap="round" />}
            {coords.length > 1 && <polyline points={points} fill="none" stroke="#1A1A1A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
            {marker && <circle cx={marker[0].toFixed(1)} cy={marker[1].toFixed(1)} r="6" fill="#2BA84A" stroke="#FFFFFF" strokeWidth="2.5" />}
          </svg>
          <span className="absolute bottom-0 right-0 rounded-tl bg-white/75 px-1 text-[8px] leading-3 text-sub">地理院タイル</span>
        </>
      )}
    </div>
  );
}
