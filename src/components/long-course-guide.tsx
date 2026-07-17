"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Download, ExternalLink, HelpCircle, LoaderCircle, MapPin, Navigation, Search, X } from "lucide-react";
import { CourseGuideMap } from "@/components/map/course-guide-map";
import { MemberGpxLink } from "@/components/member-gpx-link";
import { ElevationProfile } from "@/components/elevation-profile";
import { SpotImage } from "@/components/spot-image";
import { courseTypeLabels, surfaceLabels, type CourseType, type LineString, type Surface } from "@/lib/types";
import { reverseElevationProfile, rotateElevationProfile } from "@/lib/course-guide-profile";
import { haversine } from "@/lib/gpx";
import type { CourseGuide } from "@/lib/course-guides";
import { track } from "@/lib/track";

type StationResult = { name: string; prefecture: string; lat: number; lng: number };
type Recommendation = { station: StationResult; startId: string; differenceKm: number | null };

export function LongCourseGuide({ guide, geojson, courseType, surface }: { guide: CourseGuide; geojson: LineString; courseType: CourseType; surface: Surface }) {
  const [selectedStartId, setSelectedStartId] = useState(guide.startPoints[0].id);
  const [origin, setOrigin] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedStart = guide.startPoints.find((start) => start.id === selectedStartId) ?? guide.startPoints[0];
  const hasStartChoice = guide.startPoints.length > 1;
  const recommendedStart = recommendation ? guide.startPoints.find((start) => start.id === recommendation.startId) : null;
  const profile = useMemo(() => selectedStart.routeMode === "loop"
    ? rotateElevationProfile(guide.elevationProfile, selectedStart.routeDistanceM, guide.distanceM)
    : selectedStart.routeMode === "reverse" ? reverseElevationProfile(guide.elevationProfile, guide.distanceM) : guide.elevationProfile,
  [guide.distanceM, guide.elevationProfile, selectedStart.routeDistanceM, selectedStart.routeMode]);
  const checkpoints = useMemo(() => guide.checkpoints.map((checkpoint) => ({
    ...checkpoint,
    displayDistanceM: selectedStart.checkpointDistances[checkpoint.id] ?? checkpoint.routeDistanceM,
  })).sort((a, b) => a.displayDistanceM - b.displayDistanceM), [guide.checkpoints, selectedStart.checkpointDistances]);
  const directionsUrl = useMemo(() => {
    const params = new URLSearchParams({ api: "1", destination: `${selectedStart.destinationLat},${selectedStart.destinationLng}` });
    if (origin.trim()) params.set("origin", origin.trim());
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [origin, selectedStart]);

  useEffect(() => { track("course_guide_view", { slug: guide.slug }); }, [guide.slug]);

  const chooseStart = (id: string, source = "manual") => {
    setSelectedStartId(id);
    track("start_point_select", { slug: guide.slug, startId: id, source });
  };

  const findRecommendedStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!origin.trim()) {
      setSearchStatus("error");
      setSearchError("最寄駅名を入力してください。");
      return;
    }
    setSearchStatus("loading");
    setSearchError("");
    try {
      const response = await fetch(`/api/stations/resolve?q=${encodeURIComponent(origin.trim())}`);
      const data = await response.json() as StationResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "駅を調べられませんでした。");
      const ranked = guide.startPoints.map((start) => ({
        start,
        distanceM: haversine({ lat: data.lat, lng: data.lng }, { lat: start.destinationLat, lng: start.destinationLng }),
      })).sort((a, b) => a.distanceM - b.distanceM);
      const result = { station: data, startId: ranked[0].start.id, differenceKm: ranked[1] ? Math.max(0, (ranked[1].distanceM - ranked[0].distanceM) / 1000) : null };
      setRecommendation(result);
      setOrigin(`${data.prefecture} ${data.name}駅`);
      setSearchStatus("idle");
      chooseStart(result.startId, "recommendation");
      track("start_recommendation", { slug: guide.slug, startId: result.startId, stationPrefecture: data.prefecture });
    } catch (error) {
      setRecommendation(null);
      setSearchStatus("error");
      setSearchError(error instanceof Error ? error.message : "駅を調べられませんでした。");
    }
  };

  return <div className="space-y-10">
    <section id="overview" className="space-y-4 scroll-mt-28">
      <div className="grid grid-cols-2 border-y border-line sm:grid-cols-4">{[["距離", `${(guide.distanceM / 1000).toFixed(1)}km`], ["獲得標高", `${guide.elevationGainM ?? "—"}m`], ["形状", courseTypeLabels[courseType]], ["路面", surfaceLabels[surface]]].map(([label, value], index) => <div key={label} className={`min-w-0 px-2 py-3 text-center ${index < 2 ? "border-b border-line sm:border-b-0" : ""} ${index % 2 ? "border-l border-line" : "sm:border-l sm:border-line"}`}><p className="text-[10px] font-bold text-sub sm:text-xs">{label}</p><p className="mt-1 break-words text-base font-black leading-tight sm:text-2xl">{value}</p></div>)}</div>
      <p className="max-w-3xl leading-7">{guide.intro}</p>
    </section>

    <section id="route" className="scroll-mt-32 space-y-4"><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">ルート確認</h2><div className="overflow-hidden rounded-2xl border border-line"><CourseGuideMap geojson={geojson} checkpoints={checkpoints} startPoints={guide.startPoints} selectedStartId={selectedStart.id} /><div className="border-t border-line p-3 sm:p-5"><ElevationProfile profile={profile} checkpoints={checkpoints} totalDistanceM={guide.distanceM} startName={selectedStart.name} /></div></div>
      <div className="rounded-xl bg-cream p-4"><p className="flex items-center gap-2 font-bold"><AlertTriangle size={18} />{guide.warnings[0].title}</p><p className="mt-2 text-sm leading-6 text-sub">{guide.warnings[0].body}</p><div className="mt-2 flex flex-wrap gap-4">{guide.warnings.map((warning) => <a key={warning.title} href={warning.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-accent underline underline-offset-4">{warning.linkLabel}<ExternalLink size={11} /></a>)}</div></div>
    </section>

    <section id="highlights" className="scroll-mt-32 space-y-4"><div><h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">{guide.checkpointsTitle ?? "見どころ"}</h2><p className="mt-2 text-sm text-sub">{selectedStart.name}からの順番。カードを開くと詳しく見られます。</p></div><div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">{checkpoints.map((checkpoint, index) => <details key={checkpoint.id} className="group w-[82%] shrink-0 snap-center overflow-hidden rounded-xl border border-line bg-paper sm:w-[44%]"><summary className="cursor-pointer list-none">{checkpoint.photo ? <div className="relative"><SpotImage src={checkpoint.photo.url} alt={checkpoint.photo.alt} width={640} height={360} sizes="(min-width: 768px) 44vw, 82vw" unoptimized className="aspect-video w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-paper">{index + 1}・{(checkpoint.displayDistanceM / 1000).toFixed(1)}km</span></div> : <div className="flex items-center gap-3 bg-cream p-4"><span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-paper">{index + 1}・{(checkpoint.displayDistanceM / 1000).toFixed(1)}km</span><h3 className="text-lg font-bold">{checkpoint.name}</h3></div>}<div className="p-4">{checkpoint.photo && <h3 className="text-lg font-bold">{checkpoint.name}</h3>}<p className="mt-1 text-xs text-sub">タップして詳細を見る</p></div></summary><div className="border-t border-line p-4"><p className="text-sm leading-6 text-sub">{checkpoint.description}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cream px-2.5 py-1 font-bold">{checkpoint.surfaceLabel}</span><span className="rounded-full border border-line px-2.5 py-1">{checkpoint.caution}</span></div>{checkpoint.photo && <a href={checkpoint.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] text-sub underline">写真: {checkpoint.photo.credit} / {checkpoint.photo.license}<ExternalLink size={11} /></a>}</div></details>)}</div></section>

    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 p-3 backdrop-blur"><div className="mx-auto w-full max-w-2xl"><button onClick={() => setSheetOpen(true)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 font-black text-paper shadow-lg"><MapPin size={20} className="shrink-0" /><span>{hasStartChoice ? "スタート地点を決める" : "アクセスを確認"}</span></button></div></div>

    {sheetOpen && <div className="fixed inset-0 z-[60] bg-ink/45" role="presentation" onMouseDown={() => setSheetOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="start-sheet-title" onMouseDown={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-sub">アクセス</p><h2 id="start-sheet-title" className="text-xl font-black">{hasStartChoice ? "どこから走る？" : "スタート地点を確認"}</h2></div><button onClick={() => setSheetOpen(false)} aria-label="閉じる" className="grid size-10 place-items-center rounded-full bg-cream"><X size={20} /></button></div>
      <form onSubmit={findRecommendedStart} className="mt-5"><label htmlFor="course-origin" className="text-sm font-bold">あなたの最寄駅</label><div className="mt-2 flex items-center gap-2 rounded-lg border-2 border-ink px-3"><MapPin size={20} className="text-sub" /><input id="course-origin" value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="例：渋谷駅" className="min-w-0 flex-1 py-3.5 outline-none" /></div><button type="submit" disabled={searchStatus === "loading"} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 font-black">{searchStatus === "loading" ? <LoaderCircle size={20} className="animate-spin" /> : <Search size={20} />}{searchStatus === "loading" ? "駅を調べています…" : hasStartChoice ? "おすすめを調べる" : "行き方を調べる"}</button>{searchStatus === "error" && <p role="alert" className="mt-3 text-sm font-bold text-danger">{searchError}</p>}</form>
      {recommendation && recommendedStart && <div aria-live="polite" className="mt-5 rounded-xl border-2 border-ink p-4"><p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={18} />{recommendation.station.name}駅からのおすすめ</p><h3 className="mt-2 text-xl font-black">{recommendedStart.name}からスタート</h3><p className="mt-2 text-sm leading-6 text-sub">{recommendation.differenceKm === null ? "このコースで案内できる始点です。" : `次に近い始点候補より位置が約${recommendation.differenceKm.toFixed(1)}km近いため、おすすめします。`}</p></div>}
      {hasStartChoice && <fieldset className="mt-5"><legend className="text-sm font-bold">始点を選ぶ</legend><div className="mt-2 grid grid-cols-2 gap-2">{guide.startPoints.map((start) => <label key={start.id} className={`cursor-pointer rounded-lg p-3 ${start.id === selectedStart.id ? "border-2 border-ink bg-cream" : "border border-line"}`}><input type="radio" name="course-start" checked={start.id === selectedStart.id} onChange={() => chooseStart(start.id)} className="mr-2 accent-[#1A1A1A]" /><span className="font-bold">{start.name}</span><p className="mt-1 text-xs text-sub">{start.accessText}</p></label>)}</div></fieldset>}
      <div className="mt-5 grid gap-2"><a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("route_start", { slug: guide.slug, startId: selectedStart.id, originMode: origin.trim() ? "station" : "none" })} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand font-bold"><Navigation size={18} />{selectedStart.name}までの行き方</a><MemberGpxLink href={selectedStart.gpxHref} callbackURL={`/spots/${guide.slug}`} slug={guide.slug} meta={{ startId: selectedStart.id }} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-ink font-bold"><Download size={18} />{selectedStart.name}から走るGPXをダウンロード</MemberGpxLink></div>
      <Link href="/guide/gpx" className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-cream p-3 transition-colors hover:border-ink/30"><HelpCircle size={20} className="shrink-0" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">GPXの使い方</span><span className="block text-xs text-sub">アプリへの取り込み方法を見る</span></span><ChevronRight size={18} className="shrink-0 text-sub" /></Link>
      <p className="mt-3 text-xs leading-5 text-sub">入力内容は保存しません。駅情報は<a href="https://express.heartrails.com/" target="_blank" rel="noopener noreferrer" className="underline">HeartRails Express</a>を利用しています。</p>
    </section></div>}
  </div>;
}
