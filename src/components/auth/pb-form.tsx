"use client";

import { useActionState } from "react";
import { updatePbs, type PbState } from "@/app/me/actions";
import { formatDuration, PB_EVENTS } from "@/lib/pb";

const inputClass = "w-full rounded-lg border border-line bg-paper px-2 py-2 text-center";

function parts(total?: number) {
  if (!total) return { h: "", m: "", s: "" };
  return { h: Math.floor(total / 3600) || "", m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function PbForm({ pbs }: { pbs: { event: string; timeS: number }[] }) {
  const [state, action, pending] = useActionState<PbState, FormData>(updatePbs, {});
  const map = new Map(pbs.map((pb) => [pb.event, pb.timeS]));
  return (
    <form action={action} className="mt-5 rounded-xl border border-line bg-paper p-5">
      <div className="space-y-4">
        {PB_EVENTS.map((event) => {
          const value = parts(map.get(event.key));
          return (
            <div key={event.key} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center">
              <div>
                <label className="font-bold">{event.label}</label>
                {map.get(event.key) ? <p className="text-xs text-sub">{formatDuration(map.get(event.key)!)} 登録中</p> : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input name={`${event.key}-h`} type="number" min={0} inputMode="numeric" defaultValue={value.h} placeholder="時" className={inputClass} aria-label={`${event.label} 時`} />
                <input name={`${event.key}-m`} type="number" min={0} max={59} inputMode="numeric" defaultValue={value.m} placeholder="分" className={inputClass} aria-label={`${event.label} 分`} />
                <input name={`${event.key}-s`} type="number" min={0} max={59} inputMode="numeric" defaultValue={value.s} placeholder="秒" className={inputClass} aria-label={`${event.label} 秒`} />
              </div>
              {state.errors?.[event.key]?.map((error) => <p key={error} className="sm:col-start-2 text-sm text-danger">{error}</p>)}
            </div>
          );
        })}
      </div>
      {state.message && <p role="status" className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${state.status === "saved" ? "bg-cream" : "bg-danger/10 text-danger"}`}>{state.message}</p>}
      <button disabled={pending} className="mt-5 rounded-lg bg-brand px-5 py-3 font-bold disabled:opacity-60">{pending ? "保存中…" : "自己ベストを保存"}</button>
    </form>
  );
}
