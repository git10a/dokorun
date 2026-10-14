"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { marathonPbBadge } from "@/lib/pb";
import { formatFinishTime, type RaceReview } from "@/lib/race-reviews";

export function RaceReviewAuthor({ review }: { review: RaceReview }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = review.userAvatarUrl;
  const badge = marathonPbBadge(review.userMarathonPbS);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <Link
        href={`/u/${review.userHandle}`}
        className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 hover:underline"
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-cream text-sub">
          {image && image !== failedUrl ? (
            <img
              src={image}
              alt=""
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              onError={() => setFailedUrl(image)}
              className="size-full object-cover"
            />
          ) : (
            <UserRound size={18} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 break-words font-bold">{review.userName}</span>
      </Link>
      {badge && (
        <span
          className="shrink-0 rounded border border-line px-2 py-0.5 text-xs text-sub"
          aria-label={`プロフィールのフルマラソン自己ベスト ${formatFinishTime(review.userMarathonPbS!)}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
