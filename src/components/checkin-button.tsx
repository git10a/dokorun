"use client";

import Link from "next/link";
import { useActionState } from "react";
import { checkInRun, type CheckInState } from "@/app/me/logs/actions";

type CheckInButtonProps = {
  spotId: string;
  spotSlug: string;
  loggedIn: boolean;
  todayRunId: string | null;
};

const buttonClass = "inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-bold disabled:opacity-60";

export function CheckInButton({ spotId, spotSlug, loggedIn, todayRunId }: CheckInButtonProps) {
  const [state, formAction, pending] = useActionState<CheckInState, FormData>(checkInRun, {});
  if (todayRunId) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-paper px-4 py-2.5 text-sm font-bold">✓ 今日走ったよ済み</span>
        <Link href={`/me/logs/${todayRunId}/edit?returnTo=spot`} className="text-sm font-bold text-accent underline">ひとことを追加</Link>
      </div>
    );
  }
  if (!loggedIn) {
    return <Link href={`/login?callbackURL=${encodeURIComponent(`/spots/${spotSlug}?tab=logs#dokolog`)}`} className={buttonClass}>この辺走ったよ 🏃</Link>;
  }
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="spotId" value={spotId} />
      <input type="hidden" name="spotSlug" value={spotSlug} />
      <button disabled={pending} className={buttonClass}>{pending ? "記録中…" : "この辺走ったよ 🏃"}</button>
      {state.message && <p role="alert" className="text-xs font-bold text-danger">{state.message}</p>}
    </form>
  );
}
