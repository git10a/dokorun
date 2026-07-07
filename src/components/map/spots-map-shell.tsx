"use client";

import { useState } from "react";
import { List, Map } from "lucide-react";
import type { MapSpot } from "@/lib/types";
import { SpotsMap } from "./spots-map";

export function SpotsMapShell({ spots }: { spots: MapSpot[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-line md:block"><SpotsMap spots={spots} /></aside>
      {open && <div className="fixed inset-0 z-[60] bg-paper md:hidden"><SpotsMap spots={spots} /><button type="button" onClick={() => setOpen(false)} className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg"><List size={18} />一覧で見る</button></div>}
      {!open && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-bold text-white shadow-lg md:hidden"><Map size={18} />地図で見る</button>}
    </>
  );
}
