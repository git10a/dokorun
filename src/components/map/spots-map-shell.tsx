"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { List, Map } from "lucide-react";
import type { MapSpot } from "@/lib/types";
import { SpotsMap } from "./spots-map";

export function SpotsMapShell({ mapDataUrl }: { mapDataUrl: string }) {
  const [open, setOpen] = useState(false);
  const [mountDesktopMap, setMountDesktopMap] = useState(false);
  const [spots, setSpots] = useState<MapSpot[] | null>(null);
  const spotsRequest = useRef<Promise<MapSpot[]> | null>(null);
  const loadSpots = useCallback(() => {
    spotsRequest.current ??= fetch(mapDataUrl).then(async (response) => {
      if (!response.ok) throw new Error("地図データを取得できませんでした");
      return response.json() as Promise<MapSpot[]>;
    });
    void spotsRequest.current.then(setSpots).catch(() => setSpots([]));
  }, [mapDataUrl]);
  useEffect(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const idleApi = window as unknown as { requestIdleCallback?: (callback: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (idleApi.requestIdleCallback) {
      const idleId = idleApi.requestIdleCallback(() => { setMountDesktopMap(true); loadSpots(); });
      return () => idleApi.cancelIdleCallback?.(idleId);
    }
    const timeoutId = setTimeout(() => { setMountDesktopMap(true); loadSpots(); }, 200);
    return () => clearTimeout(timeoutId);
  }, [loadSpots]);
  return (
    <>
      <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-line bg-cream md:block">{mountDesktopMap && spots && <SpotsMap spots={spots} />}</aside>
      {open && <div className="fixed inset-0 z-[60] bg-paper md:hidden">{spots ? <SpotsMap spots={spots} /> : <div className="grid h-full place-items-center text-sm text-sub">地図を読み込んでいます…</div>}<button type="button" onClick={() => setOpen(false)} className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg"><List size={18} />一覧で見る</button></div>}
      {!open && <button type="button" onClick={() => { setOpen(true); loadSpots(); }} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg md:hidden"><Map size={18} />地図で見る</button>}
    </>
  );
}
