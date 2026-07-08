"use client";

import { useActionState } from "react";
import { createRun, updateRun, type RunFormState } from "@/app/me/logs/actions";

type Values = { id?: string; ranAt: string; comment: string | null; visibility: "public" | "private" };
const fieldClass = "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5";

export function RunForm({ spot, initial, returnTo }: { spot: { id: string; slug: string; name: string }; initial?: Values; returnTo?: "spot" | "me" }) {
  const action = initial ? updateRun : createRun;
  const [state, formAction, pending] = useActionState<RunFormState, FormData>(action, {});
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  return <form action={formAction} className="mt-7 space-y-6 rounded-2xl border border-line bg-paper p-5 sm:p-7">
    {initial?.id && <input type="hidden" name="id" value={initial.id} />}<input type="hidden" name="spotId" value={spot.id} /><input type="hidden" name="spotSlug" value={spot.slug} />{returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
    <div><label htmlFor="run-date" className="font-bold">走った日</label><input id="run-date" type="date" name="ranAt" required max={today} defaultValue={initial?.ranAt ?? today} className={fieldClass} />{state.errors?.ranAt?.map((e) => <p key={e} className="mt-1 text-sm text-danger">{e}</p>)}</div>
    <div><label htmlFor="run-comment" className="font-bold">ひとこと（任意・500文字まで）</label><textarea id="run-comment" name="comment" maxLength={500} rows={5} defaultValue={initial?.comment ?? ""} className={fieldClass} />{state.errors?.comment?.map((e) => <p key={e} className="mt-1 text-sm text-danger">{e}</p>)}</div>
    <fieldset><legend className="font-bold">公開設定</legend><div className="mt-3 flex gap-3">{[["public", "公開"], ["private", "非公開"]].map(([value, label]) => <label key={value} className="rounded-lg border border-line px-4 py-2.5 has-checked:border-brand has-checked:bg-cream"><input type="radio" name="visibility" value={value} defaultChecked={(initial?.visibility ?? "public") === value} className="mr-2 accent-(--color-brand)" />{label}</label>)}</div></fieldset>
    {state.message && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{state.message}</p>}
    <button disabled={pending} className="rounded-lg bg-brand px-6 py-3 font-bold disabled:opacity-60">{pending ? "保存中…" : initial ? "更新する" : "投稿する"}</button>
  </form>;
}
