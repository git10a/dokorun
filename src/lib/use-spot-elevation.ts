"use client";

import { useEffect, useState } from "react";
import type { RaceElevation } from "./race-elevation";

export function useSpotElevation(slug: string, enabled = true): RaceElevation | null | undefined {
  const [loaded, setLoaded] = useState<{ slug: string; profile: RaceElevation | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/spot-elevation/${encodeURIComponent(slug)}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("elevation unavailable");
        return response.json() as Promise<RaceElevation>;
      })
      .then((profile) => {
        if (profile.version !== 1 || !Array.isArray(profile.points) || profile.points.length < 2) throw new Error("empty elevation");
        if (!controller.signal.aborted) setLoaded({ slug, profile });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ slug, profile: null });
      });
    return () => controller.abort();
  }, [slug, enabled]);
  return enabled ? (loaded?.slug === slug ? loaded.profile : undefined) : null;
}
