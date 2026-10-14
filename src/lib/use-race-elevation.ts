"use client";

import { useEffect, useState } from "react";
import type { RaceElevation } from "./race-elevation";

// 高低図と坂を考えたペース表で同じJSONを使うため、取得は1回にまとめる。
// undefined: 読み込み中、null: コースなし・取得失敗・形式不正
export function useRaceElevation(slug: string, enabled: boolean): RaceElevation | null | undefined {
  const [loaded, setLoaded] = useState<{ slug: string; profile: RaceElevation | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/race-elevation/${slug}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("elevation unavailable");
        return response.json() as Promise<RaceElevation>;
      })
      .then((data) => {
        if (data.version !== 1 || !data.points?.length) throw new Error("empty elevation");
        setLoaded({ slug, profile: data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ slug, profile: null });
      });
    return () => controller.abort();
  }, [enabled, slug]);
  if (!enabled) return null;
  return loaded?.slug === slug ? loaded.profile : undefined;
}
