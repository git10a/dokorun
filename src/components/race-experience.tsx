"use client";

import { useState, type ReactNode } from "react";
import { RaceCourseMap } from "./map/race-course-map";
import { PacePlanner } from "./pace-planner";
import { RaceReviews } from "./race-reviews";
import type { RaceReviewPage } from "@/lib/race-reviews";

export function RaceExperience({ slug, name, distanceLabel, maxKm, hasCourse, mapOverlay, courseNote, initialReviews }: {
  slug: string; name: string; distanceLabel: string; maxKm: number; hasCourse: boolean;
  mapOverlay?: ReactNode; courseNote?: ReactNode; initialReviews: RaceReviewPage;
}) {
  const [selectedKm, setSelectedKm] = useState<number | null>(null);
  // ペース表で選んだ目標タイムを、体験の絞り込みにも使えるようにする
  const [paceTargetS, setPaceTargetS] = useState<number | null>(null);
  return <>
    <section id="course-map" className="mt-6 scroll-mt-24">
      <h2 className="sr-only">コースマップ・GPX</h2>
      {hasCourse ? <RaceCourseMap key={slug} slug={slug} name={name} selectedKm={selectedKm} onSelectKm={setSelectedKm} overlay={mapOverlay} note={courseNote} /> : courseNote}
    </section>
    <PacePlanner slug={slug} raceName={name} distanceKm={maxKm} hasCourse={hasCourse} onTargetChange={setPaceTargetS} />
    <div className="mt-12"><RaceReviews key={slug} slug={slug} distanceLabel={distanceLabel} maxKm={maxKm} initial={initialReviews} suggestedTargetS={paceTargetS} onSelectPoint={hasCourse ? (km) => { setSelectedKm(km); document.getElementById("course-map")?.scrollIntoView({ block: "start" }); } : undefined} /></div>
  </>;
}
