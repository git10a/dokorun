"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, LocateFixed } from "lucide-react";
import { haversine } from "@/lib/gpx";
import { track } from "@/lib/track";

// 路線ごとに代表駅の座標を最大4点サンプルした軽量インデックス(座標は小数2桁に丸め済み)
export type NearbyLineEntry = { slug: string; name: string; stationCount: number; points: [number, number][] };

type RankedLine = { slug: string; name: string; stationCount: number; distanceKm: number };

function distanceLabel(distanceKm: number) {
  return distanceKm < 1.5 ? "1km前後" : `約${Math.round(distanceKm)}km`;
}

export function NearbyLines({ lines }: { lines: NearbyLineEntry[] }) {
  const [results, setResults] = useState<RankedLine[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = () => {
    if (locating) return;
    track("lines_near_click");
    if (!("geolocation" in navigator)) {
      setError("この端末では位置情報を取得できません");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        const ranked = lines
          .map((line) => ({
            slug: line.slug,
            name: line.name,
            stationCount: line.stationCount,
            distanceKm: Math.min(...line.points.map(([lat, lng]) => haversine(here, { lat, lng }))) / 1000,
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 8);
        setResults(ranked);
        setLocating(false);
        track("lines_near_result", { top: ranked[0]?.name ?? "none" });
      },
      () => {
        setLocating(false);
        setError("位置情報を取得できませんでした。ブラウザの設定をご確認ください");
      },
      { timeout: 10_000 },
    );
  };

  return (
    <section aria-label="近くの路線" className="mt-8 rounded-2xl bg-cream p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">近くの路線からさがす</h2>
        <button type="button" onClick={locate} disabled={locating} className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 bg-paper px-4 py-1.5 text-sm font-bold transition-colors hover:bg-paper/60 disabled:opacity-70">
          {locating ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}
          {results ? "現在地を取り直す" : "現在地から出す"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-danger">{error}</p>}
      {results && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((line) => (
            <Link key={line.slug} href={`/stations/lines/${line.slug}`} className="rounded-lg border border-line bg-paper px-4 py-3 hover:bg-cream">
              <span className="font-bold">{line.name}</span>
              <span className="ml-2 text-xs text-sub">{line.stationCount}駅・{distanceLabel(line.distanceKm)}</span>
            </Link>
          ))}
        </div>
      )}
      {!results && !error && <p className="mt-3 text-sm text-sub">位置情報から、いま近くを走っている路線を上に出します。</p>}
    </section>
  );
}
