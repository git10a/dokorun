"use client";

import { useState } from "react";
import { CircleHelp, Download, Info, Navigation } from "lucide-react";
import Link from "next/link";
import { courseTypeLabels, surfaceLabels, type CourseType, type Surface } from "@/lib/types";
import { track } from "@/lib/track";

type Props = {
  slug: string;
  lat: number;
  lng: number;
  distanceM: number;
  courseType: CourseType;
  surface: Surface;
  access: string | null;
  canDownloadGpx: boolean;
};

export function RunCoursePanel({ slug, lat, lng, distanceM, courseType, surface, access, canDownloadGpx }: Props) {
  const [showGpxHelp, setShowGpxHelp] = useState(false);
  const distanceKm = (distanceM / 1000).toFixed(distanceM % 1000 ? 1 : 0);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm md:p-6">
      <h2 className="mb-4 text-sm font-bold text-sub">このコースを走る</h2>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <p className="text-lg font-bold leading-tight">登録スタート地点から走り始める</p>
          <p className="text-sm font-bold">{distanceKm}km・{courseTypeLabels[courseType]}・{surfaceLabels[surface]}</p>
          {access && <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-sub">{access}</p>}
        </div>
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_3rem] gap-3 sm:grid-cols-[auto_minmax(0,1fr)_3rem] md:max-w-md">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("route_start", { slug, destination: "google_maps" })} className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 font-bold transition-colors hover:bg-brand-dark sm:col-span-1">
            <Navigation size={20} />スタート地点へ
          </a>
          {canDownloadGpx && <>
            <a href={`/spot-gpx/${slug}.gpx`} download={`${slug}.gpx`} onClick={() => track("gpx_download", { slug })} className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-3 font-bold text-sub transition-colors hover:bg-cream">
              <Download size={20} />GPXをダウンロード
            </a>
            <button type="button" aria-label="GPXとは？使い方を表示" aria-expanded={showGpxHelp} onClick={() => { setShowGpxHelp((value) => !value); if (!showGpxHelp) track("gpx_help", { slug }); }} className="grid size-12 place-items-center rounded-lg border border-line bg-paper text-sub transition-colors hover:bg-cream hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
              <Info size={20} aria-hidden="true" />
            </button>
            {showGpxHelp && <div className="col-span-2 rounded-xl border border-line bg-cream p-4 text-left sm:col-span-3">
              <h3 className="flex items-center gap-2 text-sm font-bold"><CircleHelp size={17} />GPXとは？</h3>
              <p className="mt-2 text-xs leading-6 text-sub">走るコースの線が入ったファイルです。対応するスマートウォッチや地図アプリに読み込むと、ルート確認やナビに使えます。</p>
              <ol className="mt-3 space-y-2 text-xs leading-5 text-sub">
                <li className="flex gap-2"><span className="font-bold text-ink">1.</span><span>「GPXをダウンロード」でファイルを保存します。</span></li>
                <li className="flex gap-2"><span className="font-bold text-ink">2.</span><span>GPXに対応したウォッチ用アプリや地図アプリへ読み込みます。</span></li>
                <li className="flex gap-2"><span className="font-bold text-ink">3.</span><span>ウォッチへ同期するか、アプリでコースを開いてナビに使います。</span></li>
              </ol>
              <p className="mt-3 text-xs leading-5 text-sub">読み込み方法はアプリごとに異なります。GPXを保存しただけではナビは始まりません。</p>
              <Link href="/guide/gpx" onClick={() => track("gpx_guide", { slug })} className="mt-3 inline-flex text-sm font-bold text-accent underline decoration-brand decoration-2 underline-offset-4">アプリ別の詳しい使い方を見る →</Link>
            </div>}
          </>}
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-sub">「スタート地点へ」はGoogleマップを開きます。現地の通行状況や利用時間もあわせて確認してください。</p>
    </section>
  );
}
