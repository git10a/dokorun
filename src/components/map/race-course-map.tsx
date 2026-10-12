"use client";

import { useEffect, useMemo, useState } from "react";
import { CourseMap } from "./course-map";
import { RaceElevationChart } from "../race-elevation-chart";
import type { LineString } from "@/lib/types";
import { pointAlongCourse } from "@/lib/race-page";
import { elevationPointAtDistance, type RaceElevation } from "@/lib/race-elevation";

// Keep course data in static assets rather than the Worker bundle.
export function RaceCourseMap({ slug, name, selectedKm = null, onSelectKm }: { slug: string; name?: string; selectedKm?: number | null; onSelectKm: (km: number | null) => void }) {
  const [geojson, setGeojson] = useState<LineString | null>(null);
  const [profile, setProfile] = useState<RaceElevation | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/race-courses/${slug}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("map unavailable"); return response.json() as Promise<LineString>; })
      .then((data) => { if (!data?.coordinates?.length) throw new Error("empty map"); setGeojson(data); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    fetch(`/race-elevation/${slug}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("elevation unavailable"); return response.json() as Promise<RaceElevation>; })
      .then((data) => { if (data.version !== 1 || !data.points?.length) throw new Error("empty elevation"); setProfile(data); })
      .catch(() => { if (!controller.signal.aborted) setProfileFailed(true); });
    return () => controller.abort();
  }, [slug]);
  const highlightedPoint = useMemo((): [number, number] | null => {
    if (selectedKm === null) return null;
    if (profile) {
      if (selectedKm < 0 || selectedKm * 1000 > profile.points.at(-1)!.distanceM + 0.001) return null;
      const point = elevationPointAtDistance(profile.points, selectedKm * 1000);
      return point ? [point.lng, point.lat] : null;
    }
    return geojson ? pointAlongCourse(geojson, selectedKm) : null;
  }, [geojson, profile, selectedKm]);
  if (failed) return <p className="rounded-xl border border-line bg-cream p-6 text-sm">地図を読み込めませんでした。ページを再読み込みするか、大会公式サイトのコース図をご確認ください。</p>;
  if (!geojson) return <div className="h-[280px] w-full animate-pulse rounded-2xl border border-line bg-cream sm:h-[340px]" aria-label="コース地図を読み込み中" />;
  const [lng, lat] = geojson.coordinates[0];
  return <>
    <CourseMap lat={lat} lng={lng} geojson={geojson} name={name} highlightedPoint={highlightedPoint} className="h-[280px] sm:h-[340px]" />
    {profile ? <RaceElevationChart profile={profile} selectedDistanceM={highlightedPoint && selectedKm !== null ? selectedKm * 1000 : null} onSelect={(distance) => onSelectKm(distance / 1000)} onReset={() => onSelectKm(null)} />
      : <p className="mt-3 rounded-xl border border-line p-4 text-sm text-sub" role="status">{profileFailed ? "高低図を読み込めませんでした。ページを再読み込みしてお試しください。" : "高低図を読み込んでいます…"}</p>}
    {selectedKm !== null && !highlightedPoint && <p className="mt-2 text-xs text-sub" role="status">この地点は参考コースの範囲外のため、地図に表示できません。</p>}
  </>;
}
