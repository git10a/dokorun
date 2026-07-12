"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (next: URLSearchParams) => {
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/spots?${query}` : "/spots");
  };

  const changeSort = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("lat");
    next.delete("lng");
    if (value === "popular") {
      next.set("popular", "1");
      next.delete("sort");
      apply(next);
      return;
    }
    if (value === "near") {
      if (!("geolocation" in navigator)) {
        setError("この端末では位置情報を取得できません");
        return;
      }
      setLocating(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocating(false);
          next.set("sort", "near");
          next.set("lat", position.coords.latitude.toFixed(4));
          next.set("lng", position.coords.longitude.toFixed(4));
          track("sort_near");
          apply(next);
        },
        () => {
          setLocating(false);
          setError("位置情報を取得できませんでした。ブラウザの位置情報の許可を確認してください");
        },
        { timeout: 8000, maximumAge: 300000 },
      );
      return;
    }
    if (value === "new" && !next.has("popular")) next.delete("sort");
    else if (value === "new") next.set("sort", "new");
    else next.set("sort", value);
    apply(next);
  };

  return (
    <div className="relative">
      <select aria-label="並び順" value={searchParams.get("sort") ?? (searchParams.get("popular") === "1" ? "popular" : "new")} onChange={(event) => changeSort(event.target.value)} disabled={locating} className="h-10 rounded-lg border border-line bg-paper px-3 text-sm disabled:opacity-60">
        <option value="popular">人気順</option>
        <option value="new">新着順</option>
        <option value="near">{locating ? "現在地を取得中…" : "現在地から近い順"}</option>
        <option value="distance_asc">距離が短い順</option>
        <option value="distance_desc">距離が長い順</option>
      </select>
      {error && <div role="status" className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg">{error}</div>}
    </div>
  );
}
