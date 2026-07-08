"use client";

import { useState } from "react";
import { LoaderCircle, LocateFixed, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

// トップページはISRで静的化しているため、useSearchParams()を使うNearMeButton(hero)は
// Suspense境界が必須。見た目が同一の非インタラクティブ版を静的シェルとして先に出す
export function NearMeButtonHeroFallback() {
  return (
    <div className="text-center">
      <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-ink/85 disabled:opacity-70 sm:w-auto">
        <LocateFixed size={20} />
        現在地から近い順でさがす
      </button>
    </div>
  );
}

// 「現在地から近い順」への入口。hero=トップページの大ボタン、list=一覧ページのピル
export function NearMeButton({ variant = "list" }: { variant?: "hero" | "list" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = variant === "list" && searchParams.get("sort") === "near";

  const activate = () => {
    if (locating) return;
    if (!("geolocation" in navigator)) {
      setError("この端末では位置情報を取得できません");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = new URLSearchParams(searchParams.toString());
        next.set("sort", "near");
        next.set("lat", position.coords.latitude.toFixed(4));
        next.set("lng", position.coords.longitude.toFixed(4));
        next.delete("page");
        track("sort_near", { from: variant });
        router.push(`/spots?${next}`);
      },
      () => {
        setLocating(false);
        setError("位置情報を取得できませんでした。ブラウザの位置情報の許可を確認してください");
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const clear = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("sort");
    next.delete("lat");
    next.delete("lng");
    next.delete("page");
    router.push(next.size ? `/spots?${next}` : "/spots");
  };

  const icon = locating ? <LoaderCircle size={variant === "hero" ? 20 : 16} className="animate-spin" /> : <LocateFixed size={variant === "hero" ? 20 : 16} />;

  if (variant === "hero") {
    return (
      <div className="text-center">
        <button type="button" onClick={activate} disabled={locating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-ink/85 disabled:opacity-70 sm:w-auto">
          {icon}
          {locating ? "現在地を取得中…" : "現在地から近い順でさがす"}
        </button>
        {error && <p role="status" className="mt-2 text-sm font-bold">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      {active ? (
        <button type="button" onClick={clear} className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-ink px-3.5 py-2 text-sm font-bold text-white">
          <LocateFixed size={16} />現在地から近い順<X size={14} />
        </button>
      ) : (
        <button type="button" onClick={activate} disabled={locating} className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-paper px-3.5 py-2 text-sm font-bold hover:bg-cream disabled:opacity-70">
          {icon}
          {locating ? "現在地を取得中…" : "現在地から近い順"}
        </button>
      )}
      {error && <div role="status" className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg">{error}</div>}
    </div>
  );
}
