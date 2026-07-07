"use client";

import { MapPin } from "lucide-react";
import { track } from "@/lib/track";

export function DirectionsLink({ lat, lng, name, slug }: { lat: number; lng: number; name: string; slug: string }) {
  return (
    <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer" onClick={() => track("directions", { slug })} className="mt-3 inline-flex items-center gap-1.5 text-sm text-sub hover:text-ink" style={{ textDecoration: "underline", textDecorationColor: "var(--color-brand)", textDecorationThickness: "2px", textUnderlineOffset: "4px" }}>
      <MapPin size={14} />{name}までの行き方をGoogleマップで調べる
    </a>
  );
}
