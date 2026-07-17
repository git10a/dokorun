"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { DeleteRunForm } from "@/components/delete-run-button";
import { useLocationSearch } from "@/lib/use-location-search";

export type PublicSpotRun = {
  id: string;
  ranAt: string;
  userName: string;
  userHandle: string;
  userImageUrl: string | null;
  comment: string | null;
  photoUrl: string | null;
  canEdit: boolean;
};

const runDateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

export function SpotRunFeed({ slug, spotName, initialRuns, totalCount, tabbed = false }: { slug: string; spotName: string; initialRuns: PublicSpotRun[]; totalCount: number; tabbed?: boolean }) {
  const [runs, setRuns] = useState(initialRuns);
  const showAll = new URLSearchParams(useLocationSearch()).get("logs") === "all";

  useEffect(() => {
    fetch(`/api/spots/${slug}/runs?limit=${showAll ? 100 : 10}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("runs unavailable");
        return await response.json() as { runs: PublicSpotRun[] };
      })
      .then((data) => setRuns(data.runs))
      .catch(() => {
        // ISR HTMLの初期ログを残す。
      });
  }, [showAll, slug]);

  return <>
    <div className="mt-6 space-y-4">{runs.map((run) => (
      <article key={run.id} className="rounded-xl border border-line bg-paper p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {run.userImageUrl
              ? <img src={run.userImageUrl} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full object-cover" />
              : <span className="grid size-9 place-items-center rounded-full bg-brand font-bold">{run.userName.slice(0, 1)}</span>}
            <div><Link href={`/u/${run.userHandle}`} className="font-bold hover:text-accent">{run.userName}</Link><p className="text-xs text-sub">{runDateFormat.format(new Date(run.ranAt))}</p></div>
          </div>
          {run.canEdit && <div className="flex gap-3 text-sm font-bold"><Link href={`/me/logs/${run.id}/edit?returnTo=spot`} className="text-accent">編集</Link><DeleteRunForm id={run.id} returnTo="spot" /></div>}
        </div>
        {run.comment ? <p className="mt-3 whitespace-pre-line leading-7">{run.comment}</p> : <p className="mt-3 text-sm text-sub">走ったよ 🏃</p>}
        {run.photoUrl && <img src={run.photoUrl} alt={`${spotName}を走ったときの写真`} className="mt-3 aspect-video w-full rounded-xl object-cover" />}
      </article>
    ))}</div>
    {!runs.length && <p className="mt-6 text-sub">まだランログはありません。最初の記録を残してみませんか 🏃</p>}
    {!showAll && totalCount > 10 && <Link href={`/spots/${slug}?${tabbed ? "tab=logs&" : ""}logs=all#dokolog`} className="mt-5 inline-block font-bold text-accent">もっと見る</Link>}
  </>;
}
