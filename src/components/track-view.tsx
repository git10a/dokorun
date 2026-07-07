"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

export function TrackView({ name, meta }: { name: string; meta?: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(name, meta);
  });
  return null;
}
