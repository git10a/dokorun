"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { formatFinishTime, parseFinishTime, raceReviewPrompt, type OwnRaceReview } from "@/lib/race-reviews";
import { track } from "@/lib/track";

const fieldClass = "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-brand";

type Props = { review: OwnRaceReview; race: { name: string; distanceLabel: string; maxKm: number } | null };

export function OwnRaceReviewCard({ review, race }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function mutate(body: unknown) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/races/${review.raceSlug}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存できませんでした。");
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした。もう一度お試しください。");
      return false;
    } finally { setSaving(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const finishTimeS = parseFinishTime(String(form.get("finishTime")));
    if (finishTimeS === null) { setError("完走タイムを 3:45:00 のように入力してください。"); return; }
    if (await mutate({ raceYear: review.raceYear, finishTimeS, body: String(form.get("body")), distanceKm: form.get("distanceKm") === "" ? null : Number(form.get("distanceKm")) })) {
      track("race_review_saved", { race: review.raceSlug, edited: true });
      setEditing(false);
      setMessage(review.isHidden ? "変更を保存しました。公開停止中の状態は変わりません。" : "変更を保存しました。");
    }
  }

  return (
    <article className="rounded-xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-bold">{race ? <Link href={`/races/${review.raceSlug}#reviews`} className="text-accent hover:underline">{race.name}</Link> : "掲載を終了した大会"}</h2>
      <p className="mt-2 text-sm text-sub">{review.raceYear}年{race ? ` · ${race.distanceLabel}` : ""} · {formatFinishTime(review.finishTimeS)} 完走</p>
      {review.isHidden && <p className="mt-3 rounded-lg bg-cream p-3 text-sm">運営により公開停止中です。編集しても自動では再公開されません。</p>}
      {editing && race ? <form onSubmit={submit} className="mt-5 space-y-4">
        <p className="text-sm font-bold leading-7">{raceReviewPrompt}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">完走タイム<input name="finishTime" required defaultValue={formatFinishTime(review.finishTimeS)} placeholder="例：3:45:00" className={fieldClass} /></label>
          <label className="text-sm font-bold">何km付近？（任意）<input name="distanceKm" type="number" min={0} max={race.maxKm} step="any" defaultValue={review.distanceKm ?? ""} className={fieldClass} /></label>
        </div>
        <label className="block text-sm font-bold">伝えておきたいこと<textarea name="body" required maxLength={1500} rows={5} defaultValue={review.body} className={fieldClass} /></label>
        <p className="text-xs leading-6 text-sub">名前・開催年・完走タイム・本文は公開されます。個人の連絡先などは書かないでください。</p>
        <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-brand px-4 py-3 text-sm font-bold disabled:opacity-50">{saving ? "保存中…" : "変更を保存する"}</button><button type="button" disabled={saving} onClick={() => setEditing(false)} className="px-3 text-sm underline">編集をやめる</button></div>
      </form> : <>
        {review.distanceKm !== null && <p className="mt-3 text-xs text-sub">約{review.distanceKm}km付近</p>}
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{review.body}</p>
        {race && <div className="mt-4 flex gap-4 text-sm"><button disabled={saving} onClick={() => { setEditing(true); setDeleting(false); setError(""); setMessage(""); }} className="font-bold text-accent underline underline-offset-4">編集</button><button disabled={saving} onClick={() => setDeleting(true)} className="text-sub underline underline-offset-4">削除</button></div>}
      </>}
      {deleting && <div className="mt-4 rounded-lg bg-cream p-4 text-sm"><p>この体験を削除しますか？</p><div className="mt-3 flex gap-4"><button disabled={saving} onClick={async () => { if (await mutate({ action: "delete", id: review.id })) setDeleting(false); }} className="font-bold text-danger disabled:opacity-50">{saving ? "削除中…" : "削除する"}</button><button disabled={saving} onClick={() => setDeleting(false)}>キャンセル</button></div></div>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
    </article>
  );
}
