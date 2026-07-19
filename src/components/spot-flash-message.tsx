"use client";

import Link from "next/link";
import { track } from "@/lib/track";
import { useLocationSearch } from "@/lib/use-location-search";

type Flash = { message: string } | null;
const uuidPattern = /^[0-9a-f-]{36}$/i;

function dismissCheckinModal() {
  const url = new URL(window.location.href);
  url.searchParams.delete("posted");
  url.searchParams.delete("run");
  window.history.replaceState(window.history.state, "", url);
}

export function SpotFlashMessage({ placement }: { placement: "info" | "run" }) {
  const params = new URLSearchParams(useLocationSearch());
  const posted = params.get("posted");
  let flash: Flash = null;
  if (placement === "info" && posted === "info") flash = { message: "スポット情報を修正しました。ご協力ありがとうございます ✏️" };
  if (placement === "run" && posted === "1") flash = { message: "ランログを投稿しました" };
  if (placement === "run" && posted === "updated") flash = { message: "ランログを更新しました" };
  if (placement === "run" && posted === "deleted") flash = { message: "ランログを削除しました" };
  if (placement === "run" && posted === "checkin") {
    const runId = params.get("run");
    if (!runId || !uuidPattern.test(runId)) {
      flash = { message: "走ったよを記録しました 🏃" };
    } else {
      return <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/45 p-4" role="presentation" onMouseDown={dismissCheckinModal}>
        <section role="dialog" aria-modal="true" aria-labelledby="checkin-done-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-paper p-6 text-center shadow-2xl">
          <img src="/characters/hashiro-happy.png" alt="" className="mx-auto h-24 w-auto" />
          <h2 id="checkin-done-title" className="mt-4 text-2xl font-black">投稿しました！🏃</h2>
          <p className="mt-2 text-sm leading-6 text-sub">今日の「走ったよ」を記録しました。写真やひとことも残せます。</p>
          <div className="mt-5 grid gap-2">
            <Link href={`/me/logs/${runId}/edit?returnTo=spot`} onClick={() => track("checkin_detail_cta")} className="flex min-h-12 items-center justify-center rounded-lg bg-brand font-black">写真やコメントを追加する</Link>
            <button onClick={dismissCheckinModal} className="min-h-12 rounded-lg border border-line font-bold text-sub">あとで</button>
          </div>
        </section>
      </div>;
    }
  }

  if (!flash) return null;
  return <p className={`rounded-lg px-4 py-3 text-sm font-bold ${placement === "info" ? "bg-cream" : "mt-5 bg-paper"}`}>{flash.message}</p>;
}
