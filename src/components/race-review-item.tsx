"use client";

import Link from "next/link";
import { Pencil, Flag, Trash2 } from "lucide-react";
import { formatFinishTime, type RaceReview } from "@/lib/race-reviews";
import { RaceReviewAuthor } from "@/components/race-review-author";

export const reviewFieldClass =
  "mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brand";

// 一覧の1件。削除確認・報告フォームの開閉は一覧側が1件ずつ管理する
export function RaceReviewItem({
  review,
  distanceLabel,
  viewer,
  loginHref,
  saving,
  confirmingDelete,
  reportOpen,
  onSelectPoint,
  onEdit,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onReportToggle,
  onReport,
}: {
  review: RaceReview;
  distanceLabel: string;
  // owner: 投稿者本人、member: ほかのログイン中ユーザー、guest: 未ログイン
  viewer: "owner" | "member" | "guest";
  loginHref: string;
  saving: boolean;
  confirmingDelete: boolean;
  reportOpen: boolean;
  onSelectPoint?: (km: number) => void;
  onEdit: () => void;
  onDeleteStart: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onReportToggle: () => void;
  onReport: (reason: FormDataEntryValue | null) => void;
}) {
  return (
    <article className="py-6">
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
        {viewer === "owner" ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={onEdit}
              className="inline-flex items-center gap-1 hover:underline"
            >
              <Pencil size={13} />
              編集
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDeleteStart}
              className="inline-flex items-center gap-1 hover:underline"
            >
              <Trash2 size={13} />
              削除
            </button>
          </>
        ) : viewer === "member" ? (
          <button type="button" onClick={onReportToggle} className="inline-flex items-center gap-1 hover:underline">
            <Flag size={13} />
            報告する
          </button>
        ) : (
          <Link href={loginHref} className="hover:underline">
            ログインして報告する
          </Link>
        )}
      </div>
      {confirmingDelete && (
        <div className="mt-3 rounded-lg bg-cream p-3 text-sm">
          <p>この体験を削除しますか？</p>
          <div className="mt-2 flex gap-4">
            <button disabled={saving} onClick={onDeleteConfirm} className="font-bold text-danger">
              削除する
            </button>
            <button disabled={saving} onClick={onDeleteCancel}>
              キャンセル
            </button>
          </div>
        </div>
      )}
      {reportOpen && (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onReport(new FormData(event.currentTarget).get("reason"));
          }}
        >
          <label className="text-sm">
            報告する理由
            <textarea name="reason" required maxLength={500} className={reviewFieldClass} />
          </label>
          <button disabled={saving} className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-bold">
            運営に報告する
          </button>
        </form>
      )}
    </article>
  );
}
