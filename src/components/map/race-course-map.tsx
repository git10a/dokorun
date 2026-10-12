"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CourseMap } from "./course-map";
import { RaceElevationChart } from "../race-elevation-chart";
import type { LineString } from "@/lib/types";
import { pointAlongCourse } from "@/lib/race-page";
import { elevationPointAtDistance, type RaceElevation } from "@/lib/race-elevation";

// Keep course data in static assets rather than the Worker bundle.
// overlay: 地図の左上に重ねる操作(GPXボタンなど)。note: 地図の直下に置く作成元などの注記
export function RaceCourseMap({
  slug,
  name,
  selectedKm = null,
  onSelectKm,
  overlay,
  note,
}: {
  slug: string;
  name?: string;
  selectedKm?: number | null;
  onSelectKm: (km: number | null) => void;
  overlay?: ReactNode;
  note?: ReactNode;
}) {
  const [geojson, setGeojson] = useState<LineString | null>(null);
  const [profile, setProfile] = useState<RaceElevation | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/race-courses/${slug}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("map unavailable");
        return response.json() as Promise<LineString>;
      })
      .then((data) => {
        if (!data?.coordinates?.length) throw new Error("empty map");
        setGeojson(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    fetch(`/race-elevation/${slug}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("elevation unavailable");
        return response.json() as Promise<RaceElevation>;
      })
      .then((data) => {
        if (data.version !== 1 || !data.points?.length) throw new Error("empty elevation");
        setProfile(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileFailed(true);
      });
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
  // 注記はサーバー描画にも含めたいので、地図の読み込み前・失敗時も出す
  if (failed)
    return (
      <>
        <p className="rounded-xl border border-line bg-cream p-6 text-sm">
          地図を読み込めませんでした。ページを再読み込みするか、大会公式サイトのコース図をご確認ください。
        </p>
        {note}
      </>
    );
  if (!geojson)
    return (
      <>
        <div
          className="h-[280px] w-full animate-pulse rounded-2xl border border-line bg-cream sm:h-[340px]"
          aria-label="コース地図を読み込み中"
        />
        {note}
      </>
    );
  const [lng, lat] = geojson.coordinates[0];
  return (
    <>
      <div className="relative">
        <CourseMap
          lat={lat}
          lng={lng}
          geojson={geojson}
          name={name}
          highlightedPoint={highlightedPoint}
          className="h-[280px] sm:h-[340px]"
        />
        {overlay && <div className="absolute left-3 top-3 z-10">{overlay}</div>}
      </div>
      {note}
      {profile ? (
        <RaceElevationChart
          profile={profile}
          selectedDistanceM={highlightedPoint && selectedKm !== null ? selectedKm * 1000 : null}
          onSelect={(distance) => onSelectKm(distance / 1000)}
        />
      ) : (
        <p className="mt-3 rounded-xl border border-line p-4 text-sm text-sub" role="status">
          {profileFailed
            ? "高低図を読み込めませんでした。ページを再読み込みしてお試しください。"
            : "高低図を読み込んでいます…"}
        </p>
      )}
      {selectedKm !== null && !highlightedPoint && (
        <p className="mt-2 text-xs text-sub" role="status">
          この地点は参考コースの範囲外のため、地図に表示できません。
        </p>
      )}
    </>
  );
}
