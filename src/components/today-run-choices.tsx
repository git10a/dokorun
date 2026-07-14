"use client";

import Link from "next/link";
import { Camera, Navigation, ShieldCheck, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/track";

const choices = [
  { label: "30分くらい", href: "/spots?dist=3-5", id: "thirty_minutes", icon: Timer },
  { label: "信号少なめ", href: "/features/no-signals", id: "no_signals", icon: ShieldCheck },
  { label: "景色を楽しむ", href: "/spots?tags=scenic", id: "scenic", icon: Camera },
] as const;

const choiceClassName = "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-paper p-4 text-center transition-all hover:bg-cream hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function TodayRunChoices() {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    track("today_run_choice", { choice: "near" });
    if (!("geolocation" in navigator)) {
      setError("この端末では位置情報を取得できません");
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        track("today_location_result", { result: "success" });
        const query = new URLSearchParams({
          sort: "near",
          lat: position.coords.latitude.toFixed(4),
          lng: position.coords.longitude.toFixed(4),
        });
        router.push(`/spots?${query}`);
      },
      () => {
        setLocating(false);
        setError("位置情報を取得できませんでした。ブラウザの許可を確認してください");
        track("today_location_result", { result: "error" });
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {choices.map(({ label, href, id, icon: Icon }) => (
          <Link key={id} href={href} onClick={() => track("today_run_choice", { choice: id })} className={choiceClassName}>
            <Icon size={24} className="text-accent" aria-hidden="true" />
            <span className="text-sm font-bold">{label}</span>
          </Link>
        ))}
        <button type="button" onClick={useCurrentLocation} disabled={locating} className={`${choiceClassName} disabled:cursor-wait disabled:opacity-60`}>
          <Navigation size={24} className="text-accent" aria-hidden="true" />
          <span className="text-sm font-bold">{locating ? "現在地を取得中…" : "現在地から"}</span>
        </button>
      </div>
      {error && <p role="status" className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
