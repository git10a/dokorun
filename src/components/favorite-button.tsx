"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/app/me/actions";

export function FavoriteButton({ spotId, slug, loggedIn, initialFavorite }: { spotId: string; slug: string; loggedIn: boolean; initialFavorite: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  const onClick = () => {
    if (!loggedIn) {
      window.location.href = `/login?callbackURL=${encodeURIComponent(`/spots/${slug}`)}`;
      return;
    }
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const result = await toggleFavorite(spotId, next).catch(() => ({ ok: false }));
      if (!result.ok) setFavorite(!next);
    });
  };
  return (
    <button type="button" onClick={onClick} disabled={pending} aria-pressed={favorite} className={`flex items-center gap-2 rounded-lg border-2 border-line px-4 py-2.5 font-bold transition-colors ${favorite ? "bg-brand" : "bg-paper hover:bg-cream"} disabled:opacity-70`}>
      <Star size={18} fill={favorite ? "currentColor" : "none"} />お気に入り
    </button>
  );
}
