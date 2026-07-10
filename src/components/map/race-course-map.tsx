"use client";

import { useEffect, useState } from "react";
import { CourseMap } from "./course-map";
import type { LineString } from "@/lib/types";

// 大会コースの参考図。geojsonはWorkerバンドル肥大(3MiB制限)を避けるため
// public/race-courses/ の静的アセットからクライアントで取得する
export function RaceCourseMap({ slug, name }: { slug: string; name?: string }) {
  const [geojson, setGeojson] = useState<LineString | null>(null);
  useEffect(() => {
    let disposed = false;
    fetch(`/race-courses/${slug}.json`)
      .then((response) => (response.ok ? (response.json() as Promise<LineString>) : null))
      .then((data) => {
        if (!disposed && data?.coordinates?.length) setGeojson(data);
      })
      .catch(() => {});
    return () => { disposed = true; };
  }, [slug]);
  if (!geojson) return <div className="h-[340px] w-full animate-pulse rounded-2xl border border-line bg-cream" aria-label="コース地図を読み込み中" />;
  const [lng, lat] = geojson.coordinates[0];
  return <CourseMap lat={lat} lng={lng} geojson={geojson} name={name} />;
}
