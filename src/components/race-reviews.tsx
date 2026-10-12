"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Flag, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatFinishTime, parseFinishTime, raceReviewPrompt, type RaceReview, type RaceReviewPage } from "@/lib/race-reviews";
import { track } from "@/lib/track";
import { SectionHeading } from "@/components/section-heading";

const fieldClass = "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand";

export function RaceReviews({ slug, distanceLabel, maxKm, initial, suggestedTargetS = null, onSelectPoint }: {
  slug: string; distanceLabel: string; maxKm: number; initial: RaceReviewPage;
  // ペース表で選んだ目標タイム。触っていれば、絞り込みのワンタップ候補として出す
  suggestedTargetS?: number | null;
  onSelectPoint?: (km: number) => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [page, setPage] = useState(initial);
  const [targetInput, setTargetInput] = useState("");
  const [target, setTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RaceReview | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  // 投稿フォームは「体験を書く」を押すまで畳んでおく。ログイン後の #write-review 戻りでは開く
  const [writing, setWriting] = useState(false);
  const requestId = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const loginHref = `/login?callbackURL=${encodeURIComponent(`/races/${slug}#write-review`)}`;

  async function load(filter: number | null, offset = 0) {
    const id = ++requestId.current;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ offset: String(offset) });
      if (filter !== null) query.set("target", String(filter));
      const response = await fetch(`/api/races/${slug}/reviews?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("体験を読み込めませんでした。もう一度お試しください。");
      const result: RaceReviewPage = await response.json();
      if (id !== requestId.current) return;
      setPage((previous) => ({ ...result, reviews: offset ? [...previous.reviews, ...result.reviews.filter((item) => !previous.reviews.some((old) => old.id === item.id))] : result.reviews }));
      setTarget(filter);
      track("race_review_view", { race: slug, filtered: filter !== null });
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "読み込めませんでした");
    } finally { if (id === requestId.current) setLoading(false); }
  }

  async function mutate(body: unknown): Promise<boolean> {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/races/${slug}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存できませんでした");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした"); return false;
    } finally { setSaving(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const seconds = parseFinishTime(String(form.get("finishTime")));
    if (seconds === null) { setError("完走タイムを 3:45:00 のように入力してください。"); return; }
    const saved = await mutate({
      raceYear: editing?.raceYear ?? Number(form.get("raceYear")), finishTimeS: seconds,
      body: String(form.get("body")), distanceKm: form.get("distanceKm") === "" ? null : Number(form.get("distanceKm")),
    });
    if (saved) {
      track("race_review_saved", { race: slug, edited: Boolean(editing) });
      setEditing(null); setWriting(false); setDraftVersion((value) => value + 1); setTargetInput("");
      await load(null);
      setMessage("体験を保存しました。次に走るランナーへの共有、ありがとうございます。");
    }
  }

  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === "#write-review") setWriting(true); };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  function edit(review: RaceReview) {
    setWriting(true); setEditing(review); setDraftVersion((value) => value + 1); setMessage(""); setError("");
    document.getElementById("write-review")?.scrollIntoView({ block: "start" });
  }

  // 体験が1件もない大会では、絞り込みフォームや注意書きを出さず投稿の呼びかけだけにする
  const empty = page.available && target === null && page.reviews.length === 0 && page.nextOffset === null;

  return <section id="reviews" className="scroll-mt-24">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><SectionHeading>走った人の体験</SectionHeading>
        <p className="mt-2 text-sm leading-6 text-sub">{empty ? "この大会の体験は、まだありません。" : "自分の目標タイムに近い完走者の経験を、レース計画の参考に。"}</p></div>
      {!empty && <a href="#write-review" onClick={() => setWriting(true)} className="rounded-lg border border-line px-4 py-2 text-sm font-bold hover:bg-cream">体験を残す</a>}
    </div>
    {!empty && <form onSubmit={(event) => {
      event.preventDefault();
      const seconds = parseFinishTime(targetInput);
      if (seconds === null) { setError("目標タイムを 3:45 または 3:45:00 のように入力してください。"); return; }
      void load(seconds);
    }} className="mt-6 rounded-xl bg-cream p-4 sm:p-5">
      <label htmlFor="review-target" className="text-sm font-bold">あなたの目標タイム</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input id="review-target" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} placeholder="例：3:45:00" aria-describedby="review-filter-help" className="w-36 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm" />
        <button disabled={loading} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold disabled:opacity-50">近いタイムの体験を読む</button>
        <button type="button" disabled={loading} onClick={() => { setTargetInput(""); void load(null); }} className="px-2 py-2 text-sm underline underline-offset-4">すべて見る</button>
        {suggestedTargetS !== null && targetInput === "" && <button type="button" disabled={loading} onClick={() => { setTargetInput(formatFinishTime(suggestedTargetS)); void load(suggestedTargetS); }} className="rounded-full border border-ink bg-paper px-3 py-1.5 text-xs font-bold">ペース表の {formatFinishTime(suggestedTargetS)} で読む</button>}
      </div>
      <p id="review-filter-help" className="mt-2 text-xs leading-5 text-sub">掲載種目：{distanceLabel}。目標の前後15分で完走した人を表示します。記録は本人の申告です。</p>
    </form>}
    <div aria-live="polite" className="mt-3 text-sm">{loading && <p>読み込み中…</p>}{message && <p className="rounded-lg bg-brand/20 p-3">{message}</p>}{error && <p role="alert" className="rounded-lg border border-danger p-3 text-danger">{error}</p>}</div>
    {!page.available ? <div className="py-8 text-sm text-sub"><p>現在、体験を読み込めません。コースマップの閲覧やダウンロードは引き続きご利用いただけます。</p><button type="button" onClick={() => void load(target)} disabled={loading} className="mt-3 font-bold text-accent underline">もう一度読み込む</button></div>
      : empty ? null
      : !page.reviews.length ? <div className="py-9 text-center"><p className="font-bold">{target === null ? "この大会の体験は、まだありません。" : "このタイムに近い体験は、まだありません。"}</p><p className="mt-2 text-sm text-sub">{target === null ? "走ったことのある方は、覚えていることをひとつ残してみませんか。" : "「すべて見る」から、ほかの完走者の体験も読めます。"}</p></div>
      : <div className="mt-3 divide-y divide-line">{page.reviews.map((review) => <article key={review.id} className="py-6">
        <div className="flex flex-wrap items-center gap-2 text-sm"><strong className="rounded-md bg-cream px-2.5 py-1 tabular-nums">{formatFinishTime(review.finishTimeS)} 完走</strong><span className="text-sub">{review.raceYear}年 · {distanceLabel}</span></div>
        <p className="mt-3 text-sm font-bold"><Link href={`/u/${review.userHandle}`} className="hover:underline">{review.userName}</Link></p>
        {review.distanceKm !== null && <button type="button" onClick={() => onSelectPoint?.(review.distanceKm!)} className="mt-3 rounded-full border border-line px-3 py-1 text-xs font-bold text-accent">約{review.distanceKm}km付近{onSelectPoint ? " · 地図で見る" : ""}</button>}
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{review.body}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-sub">
          {session?.user.id === review.userId ? <><button type="button" disabled={saving} onClick={() => edit(review)} className="inline-flex items-center gap-1 hover:underline"><Pencil size={13} />編集</button><button type="button" disabled={saving} onClick={() => setDeleting(review.id)} className="inline-flex items-center gap-1 hover:underline"><Trash2 size={13} />削除</button></>
            : session ? <button type="button" onClick={() => setReporting(reporting === review.id ? null : review.id)} className="inline-flex items-center gap-1 hover:underline"><Flag size={13} />報告する</button> : <Link href={loginHref} className="hover:underline">ログインして報告する</Link>}
        </div>
        {deleting === review.id && <div className="mt-3 rounded-lg bg-cream p-3 text-sm"><p>この体験を削除しますか？</p><div className="mt-2 flex gap-4"><button disabled={saving} onClick={async () => { if (await mutate({ action: "delete", id: review.id })) { setDeleting(null); if (editing?.id === review.id) { setEditing(null); setDraftVersion((value) => value + 1); } await load(target); setMessage("削除しました。"); } }} className="font-bold text-danger">削除する</button><button disabled={saving} onClick={() => setDeleting(null)}>キャンセル</button></div></div>}
        {reporting === review.id && <form className="mt-4" onSubmit={async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); if (await mutate({ action: "report", id: review.id, reason: data.get("reason") })) { setReporting(null); setMessage("報告を受け付けました。運営が確認します。"); } }}><label className="text-sm">報告する理由<textarea name="reason" required maxLength={500} className={fieldClass} /></label><button disabled={saving} className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-bold">運営に報告する</button></form>}
      </article>)}</div>}
    {page.nextOffset !== null && <button disabled={loading} onClick={() => void load(target, page.nextOffset!)} className="mb-5 w-full rounded-lg border border-line px-4 py-3 text-sm font-bold">さらに読む</button>}
    {!empty && <p className="text-xs leading-5 text-sub">コースや当日の状況は開催年によって異なります。体験の開催年と、出場する大会の公式情報をご確認ください。</p>}
    <div id="write-review" className={`${empty ? "mt-4" : "mt-8"} scroll-mt-24 rounded-2xl border border-line bg-cream p-4 sm:p-5`}>
      <h3 className="font-bold leading-7">{raceReviewPrompt}</h3>
      <p className="mt-1 text-sm leading-6 text-sub">きつかった坂、ペースを上げられた場所、走る前に知っておきたかったこと。</p>
      {isPending ? <p className="mt-4 text-sm">ログイン状態を確認中…</p> : !session ? <Link href={loginHref} className="mt-4 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-bold">ログインして体験を残す</Link> : !writing ? <button type="button" onClick={() => setWriting(true)} className="mt-4 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-bold">体験を書く</button> : <form ref={formRef} key={draftVersion} onSubmit={submit} className="mt-5 space-y-4" onFocus={() => { if (formRef.current?.dataset.tracked !== "yes") { track("race_review_started", { race: slug }); if (formRef.current) formRef.current.dataset.tracked = "yes"; } }}>
        <p className="text-sm font-bold">{distanceLabel}{editing ? ` · ${editing.raceYear}年の体験を編集` : "の体験"}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-bold">走った年<input name="raceYear" type="number" required min={1900} max={new Date().getFullYear()} placeholder="例：2025" defaultValue={editing?.raceYear ?? ""} readOnly={Boolean(editing)} className={fieldClass} /></label>
          <label className="text-sm font-bold">完走タイム<input name="finishTime" required placeholder="例：3:45:00" defaultValue={editing ? formatFinishTime(editing.finishTimeS) : ""} aria-describedby="review-time-help" className={fieldClass} /></label>
          <label className="text-sm font-bold">何km付近？（任意）<input name="distanceKm" type="number" min={0} max={maxKm} step="any" placeholder="例：30" defaultValue={editing?.distanceKm ?? ""} className={fieldClass} /></label>
        </div>
        <p id="review-time-help" className="text-xs text-sub">実際の完走タイムを「時:分:秒」で入力してください。同じ大会・開催年の投稿は上書きされます。</p>
        <label className="block text-sm font-bold">伝えておきたいこと<textarea name="body" required maxLength={1500} rows={4} defaultValue={editing?.body ?? ""} className={fieldClass} /></label>
        <p className="text-xs leading-5 text-sub">名前・開催年・完走タイム・本文は公開されます。個人の連絡先などは書かないでください。</p>
        <div className="flex flex-wrap gap-3"><button disabled={saving || !page.available} className="rounded-lg bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-dark disabled:opacity-50">{saving ? "保存中…" : editing ? "変更を保存する" : "体験を残す"}</button><button type="button" disabled={saving} onClick={() => { setEditing(null); setWriting(false); setDraftVersion((value) => value + 1); }} className="px-3 text-sm underline">{editing ? "編集をやめる" : "閉じる"}</button></div>
      </form>}
    </div>
    {session && <Link href="/me/race-reviews" className="mt-4 inline-block text-sm font-bold text-accent underline underline-offset-4">自分が投稿した大会の体験を見る</Link>}
  </section>;
}
