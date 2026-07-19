"use client";

import { useEffect, useState } from "react";
import { CheckInButton } from "@/components/checkin-button";
import { FavoriteButton } from "@/components/favorite-button";
import { HashiritaiButton } from "@/components/hashiritai-button";

type ViewerState = {
  loggedIn: boolean;
  isHashiritai: boolean;
  isFavorite: boolean;
  todayRunId: string | null;
};

const requests = new Map<string, Promise<ViewerState>>();

function loadViewerState(slug: string) {
  const existing = requests.get(slug);
  if (existing) return existing;
  const request = fetch(`/api/spots/${slug}/viewer-state`, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("viewer state unavailable");
      return await response.json() as ViewerState;
    })
    .catch((error) => {
      requests.delete(slug);
      throw error;
    });
  requests.set(slug, request);
  return request;
}

function useViewerState(slug: string) {
  const [state, setState] = useState<ViewerState | null>(null);
  useEffect(() => {
    let active = true;
    loadViewerState(slug).then((value) => {
      if (active) setState(value);
    }).catch(() => {
      if (active) setState({ loggedIn: false, isHashiritai: false, isFavorite: false, todayRunId: null });
    });
    return () => { active = false; };
  }, [slug]);
  return state;
}

export function SpotViewerButtons({ spotId, slug, count }: { spotId: string; slug: string; count: number }) {
  const state = useViewerState(slug);
  if (!state) return <div className="h-12 w-64 animate-pulse rounded-lg bg-cream" aria-label="ユーザー情報を確認中" />;
  return <>
    <HashiritaiButton slug={slug} count={count} loggedIn={state.loggedIn} initialLiked={state.isHashiritai} />
    <FavoriteButton spotId={spotId} slug={slug} loggedIn={state.loggedIn} initialFavorite={state.isFavorite} />
  </>;
}

export function SpotCheckInActions({ spotId, slug }: { spotId: string; slug: string }) {
  const state = useViewerState(slug);
  return <div className="flex flex-wrap items-center gap-3">
    {state
      ? <CheckInButton spotId={spotId} spotSlug={slug} loggedIn={state.loggedIn} todayRunId={state.todayRunId} />
      : <div className="h-10 w-28 animate-pulse rounded-lg bg-paper" aria-label="ユーザー情報を確認中" />}
  </div>;
}
