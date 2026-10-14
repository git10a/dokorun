"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Flag, Trash2, ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatFinishTime, parseFinishTime, type RaceReview, type RaceReviewPage } from "@/lib/race-reviews";
import { track } from "@/lib/track";
import { SectionHeading } from "@/components/section-heading";
import { RaceReviewAuthor } from "@/components/race-review-author";
import { jstYear } from "@/lib/jst";
import {
  clearRaceReviewDraft,
  readRaceReviewDraft,
  saveRaceReviewDraft,
  type RaceReviewDraft,
  type RaceReviewDraftFields,
} from "@/lib/race-review-draft";

const fieldClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand";

export function RaceReviews({
  slug,
  distanceLabel,
  initial,
  onSelectPoint,
}: {
  slug: string;
  distanceLabel: string;
  maxKm: number;
  initial: RaceReviewPage;
  onSelectPoint?: (km: number) => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [page, setPage] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RaceReview | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [restoredDraft, setRestoredDraft] = useState<RaceReviewDraft | null>(null);
  const [loginInNewTab, setLoginInNewTab] = useState(false);
  const previousUserId = useRef<string | null | undefined>(undefined);
  // 投稿フォームは「体験を書く」を押すまで畳んでおく。ログイン後の #write-review 戻りでは開く
  const [writing, setWriting] = useState(false);
  const requestId = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const loginHref = `/login?callbackURL=${encodeURIComponent(`/races/${slug}#write-review`)}`;

  const load = useCallback(async (offset = 0) => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ offset: String(offset) });
      const response = await fetch(`/api/races/${slug}/reviews?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("体験を読み込めませんでした。もう一度お試しください。");
      const result: RaceReviewPage = await response.json();
      if (id !== requestId.current) return;
      setPage((previous) => ({
        ...result,
        reviews: offset
          ? [
              ...previous.reviews,
              ...result.reviews.filter((item) => !previous.reviews.some((old) => old.id === item.id)),
            ]
          : result.reviews,
      }));
      track("race_review_view", { race: slug, filtered: false });
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "読み込めませんでした");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [slug]);

  // Race pages use ISR and public-only build snapshots. Always refresh reviews
  // from the uncached API so posts and profile updates survive a page reload.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the ISR snapshot with the live API, including its loading state.
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  function continueToLogin(draft: RaceReviewDraftFields) {
    if (!saveRaceReviewDraft(slug, draft, session?.user.id ?? null)) {
      setLoginInNewTab(true);
      setError("入力内容を一時保存できませんでした。別タブでログインし、この画面に戻って保存してください。");
      return;
    }
    window.location.assign(loginHref);
  }

  async function mutate(body: unknown, onUnauthorized?: () => void): Promise<boolean> {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/races/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
        return false;
      }
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "保存できませんでした");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || isPending) return;
    const form = new FormData(event.currentTarget);
    const draft: RaceReviewDraftFields = {
      raceYear: String(form.get("raceYear")),
      finishTime: `${form.get("finishHours") || "0"}:${String(form.get("finishMinutes") || "0").padStart(2, "0")}:${String(form.get("finishSeconds") || "0").padStart(2, "0")}`,
      distanceKm: String(editing?.distanceKm ?? restoredDraft?.distanceKm ?? ""),
      body: String(form.get("body")),
      editing: Boolean(editing || restoredDraft?.editing),
    };
    const seconds = parseFinishTime(draft.finishTime);
    if (seconds === null) {
      setError("完走タイムを確認してください。20分〜24時間の範囲で入力できます。");
      return;
    }
    if (!draft.body.trim()) {
      setError("伝えておきたいことを入力してください。");
      return;
    }
    if (!session?.user) {
      continueToLogin(draft);
      return;
    }
    const saved = await mutate(
      {
        raceYear: Number(draft.raceYear),
        finishTimeS: seconds,
        body: draft.body,
        distanceKm: draft.distanceKm === "" ? null : Number(draft.distanceKm),
      },
      () => continueToLogin(draft),
    );
    if (saved) {
      clearRaceReviewDraft(slug);
      track("race_review_saved", { race: slug, edited: draft.editing });
      setRestoredDraft(null);
      setLoginInNewTab(false);
      setEditing(null);
      setWriting(false);
      window.history.replaceState(null, "", "#reviews");
      setDraftVersion((value) => value + 1);
      await load();
      setMessage("体験を保存しました。");
    }
  }

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#write-review") setWriting(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    if (isPending) return;
    const restore = () => {
      const userId = session?.user.id ?? null;
      const oldUserId = previousUserId.current;
      previousUserId.current = userId;
      const changedAccount = oldUserId !== undefined && oldUserId !== null && oldUserId !== userId;
      if (changedAccount) {
        setEditing(null);
        setRestoredDraft(null);
        setDraftVersion((value) => value + 1);
      }
      const draft = readRaceReviewDraft(slug, userId);
      // セッション確認中に書き始めた内容を復元処理で上書きしない。
      const hasInput = formRef.current?.dataset.dirty === "yes";
      if (!draft || (hasInput && !changedAccount)) return;
      setRestoredDraft(draft);
      setWriting(true);
      setDraftVersion((value) => value + 1);
    };
    restore();
  }, [isPending, session?.user.id, slug]);

  function edit(review: RaceReview) {
    setRestoredDraft(null);
    setLoginInNewTab(false);
    setWriting(true);
    setEditing(review);
    setDraftVersion((value) => value + 1);
    setMessage("");
    setError("");
    document.getElementById("reviews")?.scrollIntoView({ block: "start" });
  }

  const empty = page.available && page.reviews.length === 0 && page.nextOffset === null;

  function backToReviews() {
    setWriting(false);
    setError("");
    window.history.replaceState(null, "", "#reviews");
    requestAnimationFrame(() => document.getElementById("write-review-button")?.focus({ preventScroll: true }));
  }

  useEffect(() => {
    if (writing) {
      document.getElementById("review-back-button")?.focus({ preventScroll: true });
      document.getElementById("reviews")?.scrollIntoView({ block: "start" });
    }
  }, [writing]);

  const currentYear = jstYear(new Date());
  const selectedYear = editing?.raceYear ?? restoredDraft?.raceYear ?? "";
  const yearLocked = Boolean(editing || restoredDraft?.editing);
  const timeParts = (editing ? formatFinishTime(editing.finishTimeS) : (restoredDraft?.finishTime ?? "")).split(":");

  return (
    <section id="reviews" className="scroll-mt-24">
      <div hidden={writing}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading>走った人の体験</SectionHeading>
          <button
            id="write-review-button"
            type="button"
            onClick={() => {
              setMessage("");
              setError("");
              setWriting(true);
            }}
            aria-controls="write-review"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-dark"
          >
            体験を書く
          </button>
        </div>
        <div aria-live="polite" className="mt-3 text-sm">
          {loading && <p>読み込み中…</p>}
          {message && <p className="rounded-lg bg-brand/20 p-3">{message}</p>}
          {error && !writing && (
            <p role="alert" className="rounded-lg border border-danger p-3 text-danger">
              {error}
            </p>
          )}
        </div>
        {!page.available ? (
          <div className="py-8 text-sm text-sub">
            <p>現在、体験を読み込めません。コースマップの閲覧やダウンロードは引き続きご利用いただけます。</p>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="mt-3 font-bold text-accent underline"
            >
              もう一度読み込む
            </button>
          </div>
        ) : empty ? (
          <div className="py-9 text-center">
            <p className="text-sm text-sub">まだ体験はありません。</p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {page.reviews.map((review) => (
              <article key={review.id} className="py-6">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <strong className="rounded-md bg-cream px-2.5 py-1 tabular-nums">
                    {formatFinishTime(review.finishTimeS)} 完走
                  </strong>
                  <span className="text-sub">
                    {review.raceYear}年 · {distanceLabel}
                  </span>
                </div>
                {review.distanceKm !== null && (
                  <button
                    type="button"
                    onClick={() => onSelectPoint?.(review.distanceKm!)}
                    className="mt-3 rounded-full border border-line px-3 py-1 text-xs font-bold text-accent"
                  >
                    約{review.distanceKm}km付近{onSelectPoint ? " · 地図で見る" : ""}
                  </button>
                )}
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{review.body}</p>
                <RaceReviewAuthor review={review} />
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-sub">
                  {session?.user.id === review.userId ? (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => edit(review)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Pencil size={13} />
                        編集
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setDeleting(review.id)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Trash2 size={13} />
                        削除
                      </button>
                    </>
                  ) : session ? (
                    <button
                      type="button"
                      onClick={() => setReporting(reporting === review.id ? null : review.id)}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <Flag size={13} />
                      報告する
                    </button>
                  ) : (
                    <Link href={loginHref} className="hover:underline">
                      ログインして報告する
                    </Link>
                  )}
                </div>
                {deleting === review.id && (
                  <div className="mt-3 rounded-lg bg-cream p-3 text-sm">
                    <p>この体験を削除しますか？</p>
                    <div className="mt-2 flex gap-4">
                      <button
                        disabled={saving}
                        onClick={async () => {
                          if (await mutate({ action: "delete", id: review.id })) {
                            setDeleting(null);
                            if (editing?.id === review.id) {
                              setEditing(null);
                              setDraftVersion((value) => value + 1);
                            }
                            await load();
                            setMessage("削除しました。");
                          }
                        }}
                        className="font-bold text-danger"
                      >
                        削除する
                      </button>
                      <button disabled={saving} onClick={() => setDeleting(null)}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
                {reporting === review.id && (
                  <form
                    className="mt-4"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      if (await mutate({ action: "report", id: review.id, reason: data.get("reason") })) {
                        setReporting(null);
                        setMessage("報告を受け付けました。運営が確認します。");
                      }
                    }}
                  >
                    <label className="text-sm">
                      報告する理由
                      <textarea name="reason" required maxLength={500} className={fieldClass} />
                    </label>
                    <button
                      disabled={saving}
                      className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-bold"
                    >
                      運営に報告する
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
        {page.nextOffset !== null && (
          <button
            disabled={loading}
            onClick={() => void load(page.nextOffset!)}
            className="mb-5 w-full rounded-lg border border-line px-4 py-3 text-sm font-bold"
          >
            さらに読む
          </button>
        )}
        {!empty && (
          <p className="text-xs leading-5 text-sub">
            コースや当日の状況は開催年によって異なります。体験の開催年と、出場する大会の公式情報をご確認ください。
          </p>
        )}
      </div>
      <div id="write-review" hidden={!writing} className="scroll-mt-24">
        <button
          id="review-back-button"
          type="button"
          disabled={saving}
          onClick={backToReviews}
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-sub hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          体験一覧に戻る
        </button>
        <SectionHeading>{editing || restoredDraft?.editing ? "体験を編集" : "体験を書く"}</SectionHeading>
        <form
          ref={formRef}
          key={draftVersion}
          onSubmit={submit}
          onChange={() => {
            if (formRef.current) formRef.current.dataset.dirty = "yes";
          }}
          className="mt-5 space-y-4"
          onFocus={() => {
            if (formRef.current?.dataset.tracked !== "yes") {
              track("race_review_started", { race: slug });
              if (formRef.current) formRef.current.dataset.tracked = "yes";
            }
          }}
        >
          {restoredDraft && (
            <p className="rounded-lg bg-brand/20 px-3 py-2 text-sm">
              入力内容を引き継ぎました。内容を確認して保存してください。
            </p>
          )}
          <p className="text-sm font-bold">
            {distanceLabel}
            {editing || restoredDraft?.editing
              ? ` · ${editing?.raceYear ?? restoredDraft?.raceYear}年の体験を編集`
              : "の体験"}
          </p>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <label className="text-sm font-bold">
              走った年
              <select name="raceYear" required defaultValue={selectedYear} disabled={yearLocked} className={fieldClass}>
                <option value="" disabled>
                  年を選択
                </option>
                {Array.from({ length: currentYear - 1900 + 1 }, (_, index) => currentYear - index).map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
              {yearLocked && <input type="hidden" name="raceYear" value={selectedYear} />}
            </label>
            <fieldset aria-describedby="review-time-help" className="min-w-0">
              <legend className="text-sm font-bold">完走タイム</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["finishHours", "時間", "[0-9]{1,2}", "3"],
                    ["finishMinutes", "分", "[0-5]?[0-9]", "45"],
                    ["finishSeconds", "秒", "[0-5]?[0-9]", "00"],
                  ] as const
                ).map(([name, unit, pattern, placeholder], index) => (
                  <label key={name} className="flex min-w-0 items-center gap-1.5">
                    <input
                      name={name}
                      type="text"
                      inputMode="numeric"
                      pattern={pattern}
                      maxLength={2}
                      required={index < 2}
                      aria-label={`完走タイム（${unit}）`}
                      placeholder={placeholder}
                      defaultValue={timeParts[index] ?? ""}
                      className={`${fieldClass} min-w-0 text-center tabular-nums`}
                    />
                    <span className="mt-2 shrink-0 text-sm">{unit}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <p id="review-time-help" className="text-xs text-sub">
            秒がわからない場合は空欄でかまいません。同じ大会・開催年の投稿は上書きされます。
          </p>
          <label className="block text-sm font-bold">
            伝えておきたいこと
            <textarea
              name="body"
              required
              maxLength={1500}
              rows={5}
              placeholder="きつかった坂、ペース配分、走る前に知っておきたかったことなど。"
              defaultValue={editing?.body ?? restoredDraft?.body ?? ""}
              className={fieldClass}
            />
          </label>
          <p className="text-xs leading-5 text-sub">
            名前・開催年・完走タイム・本文は公開されます。個人の連絡先などは書かないでください。
          </p>
          {!session?.user && (
            <p className="text-xs text-sub">保存する際にログインが必要です。入力内容は引き継がれます。</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {loginInNewTab && (
            <a
              href={loginHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-bold text-accent underline"
            >
              別タブでログインする
            </a>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={saving || isPending || !page.available}
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-dark disabled:opacity-50"
            >
              {saving
                ? "保存中…"
                : isPending
                  ? "確認中…"
                  : editing || restoredDraft?.editing
                    ? "変更を保存する"
                    : "保存する"}
            </button>
          </div>
        </form>
      </div>
      {session && !writing && (
        <Link
          href="/me/race-reviews"
          className="mt-4 inline-block text-sm font-bold text-accent underline underline-offset-4"
        >
          自分が投稿した大会の体験を見る
        </Link>
      )}
    </section>
  );
}
