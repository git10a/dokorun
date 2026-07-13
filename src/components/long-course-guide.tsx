"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, LoaderCircle, MapPin, Navigation, Search } from "lucide-react";
import { CourseGuideMap } from "@/components/map/course-guide-map";
import { ElevationProfile } from "@/components/elevation-profile";
import { SpotImage } from "@/components/spot-image";
import { courseTypeLabels, surfaceLabels, type CourseType, type LineString, type Surface } from "@/lib/types";
import { rotateElevationProfile, shiftRouteDistance } from "@/lib/course-guide-profile";
import { haversine } from "@/lib/gpx";
import type { CourseGuide } from "@/lib/course-guides";
import { track } from "@/lib/track";

type StationResult = { name: string; prefecture: string; lat: number; lng: number };
type Recommendation = { station: StationResult; startId: string; differenceKm: number };

export function LongCourseGuide({ guide, geojson, courseType, surface }: { guide: CourseGuide; geojson: LineString; courseType: CourseType; surface: Surface }) {
  const [selectedStartId, setSelectedStartId] = useState(guide.startPoints[0].id);
  const [origin, setOrigin] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState("");
  const selectedStart = guide.startPoints.find((start) => start.id === selectedStartId) ?? guide.startPoints[0];
  const recommendedStart = recommendation ? guide.startPoints.find((start) => start.id === recommendation.startId) : null;
  const profile = useMemo(() => rotateElevationProfile(guide.elevationProfile, selectedStart.routeDistanceM, guide.distanceM), [guide, selectedStart.routeDistanceM]);
  const checkpoints = useMemo(() => guide.checkpoints.map((checkpoint) => ({
    ...checkpoint,
    displayDistanceM: shiftRouteDistance(checkpoint.routeDistanceM, selectedStart.routeDistanceM, guide.distanceM),
  })).sort((a, b) => a.displayDistanceM - b.displayDistanceM), [guide, selectedStart.routeDistanceM]);
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
      const result = { station: data, startId: ranked[0].start.id, differenceKm: Math.max(0, (ranked[1].distanceM - ranked[0].distanceM) / 1000) };
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

  return (
    <div className="space-y-10">
      <section aria-labelledby="course-decision-heading" className="space-y-4">
        <div><h2 id="course-decision-heading" className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">このコースを走る前に</h2><p className="mt-3 max-w-3xl leading-7 text-sub">{guide.intro}</p></div>
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-line">
            {[["距離", `${(guide.distanceM / 1000).toFixed(1)}km`], ["獲得標高", `${guide.elevationGainM ?? "—"}m`], ["形状", courseTypeLabels[courseType]], ["路面", surfaceLabels[surface]]].map(([label, value], index) => <div key={label} className={`px-3 py-5 text-center ${index < 2 ? "border-b border-line md:border-b-0" : ""} ${index % 2 ? "border-l border-line md:border-l-0" : ""}`}><p className="text-xs font-bold text-sub">{label}</p><p className="mt-1 text-2xl font-black sm:text-3xl">{value}</p></div>)}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{guide.warnings.map((warning) => <div key={warning.title} className="rounded-xl border border-line bg-cream p-4"><h3 className="flex items-center gap-2 font-bold"><AlertTriangle size={18} />{warning.title}</h3><p className="mt-2 text-sm leading-6 text-sub">{warning.body}</p><a href={warning.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent underline underline-offset-4">{warning.linkLabel}<ExternalLink size={12} /></a></div>)}</div>
      </section>

      <section aria-labelledby="course-overview-heading" className="space-y-5">
        <h2 id="course-overview-heading" className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">コース全体</h2>
        <CourseGuideMap geojson={geojson} checkpoints={guide.checkpoints} startPoints={guide.startPoints} selectedStartId={selectedStart.id} />
        <ElevationProfile profile={profile} checkpoints={checkpoints} totalDistanceM={guide.distanceM} startName={selectedStart.name} />
      </section>

      <section aria-labelledby="course-sections-heading" className="space-y-5">
        <div><h2 id="course-sections-heading" className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">区間ごとの雰囲気</h2><p className="mt-3 text-sm text-sub">{selectedStart.name}から進行方向に並べています。</p></div>
        <div className="grid gap-5 md:grid-cols-2">{checkpoints.map((checkpoint, index) => <article key={checkpoint.id} className="overflow-hidden rounded-xl border border-line bg-paper"><figure><div className="relative"><SpotImage src={checkpoint.photo.url} alt={checkpoint.photo.alt} width={960} height={540} sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="aspect-video w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-paper">{index + 1}・{(checkpoint.displayDistanceM / 1000).toFixed(1)}km</span></div><figcaption className="px-4 pt-3 text-xs leading-5 text-sub">{checkpoint.photo.caption}</figcaption></figure><div className="p-4 pt-3"><h3 className="text-lg font-bold">{checkpoint.name}</h3><p className="mt-2 text-sm leading-6 text-sub">{checkpoint.description}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-cream px-2.5 py-1 font-bold">{checkpoint.surfaceLabel}</span><span className="rounded-full border border-line px-2.5 py-1">注意: {checkpoint.caution}</span></div><a href={checkpoint.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] text-sub underline underline-offset-4">写真: {checkpoint.photo.credit} / {checkpoint.photo.license}<ExternalLink size={11} /></a></div></article>)}</div>
      </section>

      <section aria-labelledby="start-choice-heading" className="space-y-5">
        <div><h2 id="start-choice-heading" className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">どこから走る？</h2><p className="mt-3 leading-7 text-sub">あなたの最寄駅から、位置の近いスタート地点をおすすめします。</p></div>
        <div className="rounded-2xl border border-line bg-cream p-4 sm:p-6">
          <form onSubmit={findRecommendedStart} className="max-w-xl">
            <label htmlFor="course-origin" className="text-sm font-bold">あなたの最寄駅</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border-2 border-ink bg-paper px-3 focus-within:ring-2 focus-within:ring-brand">
              <MapPin size={20} className="shrink-0 text-sub" />
              <input id="course-origin" value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="例：渋谷駅" autoComplete="off" className="min-w-0 flex-1 bg-transparent py-3.5 text-base outline-none" />
            </div>
            <button type="submit" disabled={searchStatus === "loading"} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border-2 border-ink bg-brand px-5 py-3 font-black shadow-[3px_3px_0_#1A1A1A] transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70">
              {searchStatus === "loading" ? <LoaderCircle size={21} className="animate-spin" /> : <Search size={21} />}
              {searchStatus === "loading" ? "駅を調べています…" : "最寄駅からおすすめを調べる"}
            </button>
            {searchStatus === "error" && <p role="alert" className="mt-3 text-sm font-bold text-danger">{searchError}</p>}
            <p className="mt-3 text-xs leading-5 text-sub">入力内容は保存しません。駅情報は<a href="https://express.heartrails.com/" target="_blank" rel="noopener noreferrer" className="mx-1 underline underline-offset-4">HeartRails Express</a>を利用しています。</p>
          </form>

          {recommendation && recommendedStart && <div aria-live="polite" className="mt-6 rounded-xl border-2 border-ink bg-paper p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={20} className="text-brand-dark" />{recommendation.station.name}駅からのおすすめ</p>
            <h3 className="mt-2 text-2xl font-black">{recommendedStart.name}からスタート</h3>
            <p className="mt-2 text-sm leading-6 text-sub">駅の位置で比べると、もう一方の始点より約{recommendation.differenceKm.toFixed(1)}km近いためおすすめします。実際の乗換や所要時間はGoogleマップで確認できます。</p>
          </div>}

          <fieldset className="mt-6 border-t border-line pt-5">
            <legend className="text-sm font-bold">自分で始点を選ぶ</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-2">{guide.startPoints.map((start) => { const selected = start.id === selectedStart.id; return <label key={start.id} className={`relative cursor-pointer rounded-xl bg-paper p-4 transition-colors ${selected ? "border-2 border-ink shadow-sm" : "border border-line hover:border-ink"}`}><input type="radio" name="course-start" value={start.id} checked={selected} onChange={() => chooseStart(start.id)} className="absolute right-4 top-4 size-5 accent-[#1A1A1A]" /><div className="pr-8"><span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold">{start.badge}</span><h3 className="mt-3 text-lg font-bold">{start.name}</h3><p className="mt-2 text-sm font-bold">{start.accessText}</p><p className="mt-1 text-xs leading-5 text-sub">{start.facilitiesText}</p><p className="mt-3 border-t border-line pt-3 text-sm leading-6">{start.firstSection}</p></div></label>; })}</div>
          </fieldset>

          <div className="mt-6 grid gap-3 sm:grid-cols-2"><a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("route_start", { slug: guide.slug, startId: selectedStart.id, originMode: origin.trim() ? "typed" : "blank" })} className="flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-center font-bold hover:bg-brand-dark"><Navigation size={20} />{selectedStart.name}までの行き方</a><a href={selectedStart.gpxHref} download onClick={() => track("gpx_download", { slug: guide.slug, startId: selectedStart.id })} className="flex min-h-14 items-center justify-center gap-2 rounded-lg border-2 border-ink bg-paper px-5 py-3 text-center font-bold hover:bg-white"><Download size={20} />{selectedStart.name}から走るGPXをダウンロード</a></div>
          <p className="mt-4 text-xs leading-5 text-sub">始点を選ぶと高低図とGPXのスタート位置も変わります。GPXの読み込み方は<Link href="/guide/gpx" className="ml-1 font-bold text-accent underline underline-offset-4">アプリ別ガイド</Link>をご覧ください。</p>
        </div>
      </section>
    </div>
  );
}
