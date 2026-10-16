"use client";

import { CourseAtmosphere } from "@/components/course-atmosphere";
import type { CourseAtmosphere as Atmosphere } from "@/lib/course-atmosphere";
import { useState } from "react";
import { CourseMap } from "@/components/map/course-map";
import { RaceElevationChart } from "@/components/race-elevation-chart";
import { useSpotElevation } from "@/lib/use-spot-elevation";
import { elevationPointAtDistance } from "@/lib/race-elevation";
import type { LineString } from "@/lib/types";

export function SpotCourseMap({
  slug,
  lat,
  lng,
  geojson,
  name,
  atmosphere,
}: {
  atmosphere?: Atmosphere;
  slug: string;
  lat: number;
  lng: number;
  geojson: LineString | null;
  name: string;
}) {
  const profile = useSpotElevation(slug, Boolean(geojson));
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const selected = profile && distanceM !== null ? elevationPointAtDistance(profile.points, distanceM) : null;
  return (
    <div className="space-y-10">
      <div id="route" className="scroll-mt-32 overflow-hidden rounded-2xl border border-line">
        <CourseMap
          lat={lat}
          lng={lng}
          geojson={geojson}
          name={name}
          highlightedPoint={selected ? [selected.lng, selected.lat] : null}
        />
        {geojson && (
          <div className="border-t border-line p-3 sm:p-5">
            {profile ? (
              <RaceElevationChart profile={profile} selectedDistanceM={distanceM} onSelect={setDistanceM} />
            ) : (
              <p className="py-4 text-sm text-sub" role="status">
                {profile === undefined
                  ? "標高データを読み込み中…"
                  : "標高データを読み込めませんでした。時間をおいて再度お試しください。"}
              </p>
            )}
          </div>
        )}
      </div>
      {atmosphere && (
        <CourseAtmosphere
          atmosphere={atmosphere}
          onSelectPoint={(distance) => {
            setDistanceM(distance);
            document.getElementById("route")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}
    </div>
  );
}
