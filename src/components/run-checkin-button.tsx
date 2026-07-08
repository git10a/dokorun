"use client";

import { useState, useTransition } from "react";
import { setRunDay } from "@/app/me/actions";

export function RunCheckinButton({ offset = 0, checked = false, compact = false }: { offset?: 0 | -1; checked?: boolean; compact?: boolean }) {
  const [on, setOn] = useState(checked);
  const [pending, startTransition] = useTransition();
  const label = offset === 0 ? "今日走った" : "昨日走った";
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          try {
            await setRunDay(offset, next);
          } catch {
            setOn(!next);
          }
        });
      }}
      className={`${compact ? "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream" : "rounded-lg border border-line px-4 py-2.5"} font-bold ${on ? "bg-brand" : "bg-paper"} disabled:opacity-60`}
    >
      {on ? `${label} 済み` : label}
    </button>
  );
}
