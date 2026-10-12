"use client";

import { useEffect, useState } from "react";
import { SpotCard } from "./spot-card";
import { distanceBetweenKm } from "@/lib/spot-search";
import { readLocalLocation, saveLocalLocation, type LocalLocation } from "@/lib/local-location";
import type { SpotSummary } from "@/lib/types";

export function NearbySpotResults({ spots, fallback }: { spots: SpotSummary[]; fallback: boolean }) {
  const [location, setLocation] = useState<LocalLocation | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate tab-only coordinates; never serialize them in server HTML.
    setLocation(readLocalLocation());
    const update = (event: Event) => {
      setLocation((event as CustomEvent<LocalLocation>).detail);
      setPage(1);
    };
    window.addEventListener("dokorun-location", update);
    return () => window.removeEventListener("dokorun-location", update);
  }, []);
  if (!location)
    return (
      <div className="rounded-xl border border-line bg-cream p-6 text-center">
        <p className="text-sm leading-7">現在地は端末内で距離の計算に使います。サーバーには送信しません。</p>
        <button
          className="mt-4 rounded-lg bg-brand px-4 py-3 font-bold"
          onClick={() => {
            if (!navigator.geolocation) {
              setMessage("この端末では位置情報を取得できません");
              return;
            }
            setMessage("現在地を取得中…");
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const here = { lat: position.coords.latitude, lng: position.coords.longitude };
                saveLocalLocation(here);
                setLocation(here);
                setMessage("");
              },
              () => setMessage("位置情報を取得できませんでした。ブラウザの許可を確認してください"),
              { timeout: 8000, maximumAge: 300000 },
            );
          }}
        >
          現在地を取得する
        </button>
        {message && (
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
        )}
      </div>
    );
  const ranked = spots
    .map((spot) => ({ spot, awayKm: distanceBetweenKm(location.lat, location.lng, spot.lat, spot.lng) }))
    .sort((a, b) => a.awayKm - b.awayKm || a.spot.slug.localeCompare(b.spot.slug));
  const visible = fallback ? ranked.slice(0, 3) : ranked.slice((page - 1) * 20, page * 20);
  const pages = Math.ceil(spots.length / 20);
  return (
    <div className="space-y-4">
      {fallback && (
        <p className="rounded-xl bg-cream p-5 text-sm leading-7">
          条件に合うスポットは見つかりませんでした。条件を広げて、現在地に近い候補を表示しています。
        </p>
      )}
      {visible.map(({ spot, awayKm }) => (
        <div key={spot.id} className="space-y-2">
          <p className="text-sm text-sub">現在地から約{awayKm < 10 ? awayKm.toFixed(1) : Math.round(awayKm)}km</p>
          <SpotCard spot={spot} />
        </div>
      ))}
      {!fallback && pages > 1 && (
        <nav aria-label="ページネーション" className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              onClick={() => setPage(value)}
              aria-current={value === page ? "page" : undefined}
              className={`grid size-10 place-items-center rounded-lg border font-bold ${value === page ? "border-brand bg-brand" : "border-line"}`}
            >
              {value}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
