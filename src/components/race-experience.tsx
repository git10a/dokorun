"use client";

import { useState, type ReactNode } from "react";
import { RaceCourseMap } from "./map/race-course-map";
import { PacePlanner } from "./pace-planner";
import { RaceReviews } from "./race-reviews";
import type { RaceReviewPage } from "@/lib/race-reviews";
import { RaceCoursePoints } from "./race-course-points";
import type { RaceEditorial } from "@/lib/course-editorial";
import type { RaceAtmosphere as Atmosphere } from "@/lib/race-atmosphere";

export function RaceExperience({
  slug,
  name,
  distanceLabel,
  maxKm,
  hasCourse,
  mapOverlay,
  courseNote,
  editorial,
  atmosphere,
  initialReviews,
}: {
  slug: string;
  name: string;
  distanceLabel: string;
  maxKm: number;
  hasCourse: boolean;
  mapOverlay?: ReactNode;
  courseNote?: ReactNode;
  editorial?: RaceEditorial;
  atmosphere?: Atmosphere;
  initialReviews: RaceReviewPage;
}) {
  const [selectedKm, setSelectedKm] = useState<number | null>(null);
  // 予習ポイントや体験の距離から、地図・高低図の該当地点へ移る
  const selectPoint = hasCourse
    ? (km: number) => {
        setSelectedKm(km);
        document.getElementById("course-map")?.scrollIntoView({ block: "start" });
      }
    : undefined;
  return (
    <>
      <section id="course-map" className="mt-6 scroll-mt-24">
        <h2 className="sr-only">コースマップ・ダウンロード</h2>
        {hasCourse ? (
          <RaceCourseMap
            key={slug}
            slug={slug}
            name={name}
            selectedKm={selectedKm}
            onSelectKm={setSelectedKm}
            overlay={mapOverlay}
            note={courseNote}
          />
        ) : (
          courseNote
        )}
      </section>
      {(editorial || atmosphere) && (
        <RaceCoursePoints entry={editorial} atmosphere={atmosphere} onSelectPoint={selectPoint} />
      )}
      <PacePlanner slug={slug} raceName={name} distanceKm={maxKm} hasCourse={hasCourse} />
      <div className="mt-12">
        <RaceReviews
          key={slug}
          slug={slug}
          distanceLabel={distanceLabel}
          initial={initialReviews}
          onSelectPoint={selectPoint}
        />
      </div>
    </>
  );
}
