"use client";

import Link from "next/link";
import { useLocationSearch } from "@/lib/use-location-search";

type Flash = { message: string; runId?: string } | null;
const uuidPattern = /^[0-9a-f-]{36}$/i;

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
    flash = { message: "走ったよを記録しました 🏃", runId: runId && uuidPattern.test(runId) ? runId : undefined };
  }

  if (!flash) return null;
  return <p className={`rounded-lg px-4 py-3 text-sm font-bold ${placement === "info" ? "bg-cream" : "mt-5 bg-paper"}`}>
    {flash.message}
    {flash.runId && <> <Link href={`/me/logs/${flash.runId}/edit?returnTo=spot`} className="underline">ひとことや写真を追加する</Link></>}
  </p>;
}
