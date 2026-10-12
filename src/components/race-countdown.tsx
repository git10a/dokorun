"use client";

import { useSyncExternalStore } from "react";
import { daysUntil, jstTodayKey } from "@/lib/race-date";

function label(days: number) {
  if (days < 0) return { text: "今年は開催済み", tone: "bg-cream text-sub" };
  if (days === 0) return { text: "本日開催", tone: "bg-ink text-white" };
  return { text: `あと${days}日`, tone: days <= 30 ? "bg-brand text-ink" : "bg-cream text-ink" };
}

const subscribeNothing = () => () => {};

// ページはISRで最大1日キャッシュされるため、ハイドレーション後は閲覧時の日付で数え直す
export function RaceCountdown({
  dateKey,
  serverTodayKey,
  className = "px-2.5 py-1",
}: {
  dateKey: string;
  serverTodayKey: string;
  className?: string;
}) {
  const todayKey = useSyncExternalStore(
    subscribeNothing,
    () => jstTodayKey(),
    () => serverTodayKey,
  );
  const { text, tone } = label(daysUntil(dateKey, todayKey));
  return <span className={`rounded-full text-xs font-bold ${tone} ${className}`}>{text}</span>;
}
