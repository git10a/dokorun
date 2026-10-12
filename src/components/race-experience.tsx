"use client";

import { useState, type ReactNode } from "react";
import { RaceCourseMap } from "./map/race-course-map";
import { PacePlanner } from "./pace-planner";
import { RaceReviews } from "./race-reviews";
import type { RaceReviewPage } from "@/lib/race-reviews";

export function RaceExperience({ slug, name, distanceLabel, maxKm, hasCourse, courseInfo, initialReviews }: {
  slug: string; name: string; distanceLabel: string; maxKm: number; hasCourse: boolean;
  courseInfo: ReactNode; initialReviews: RaceReviewPage;
}) {
  const [selectedKm, setSelectedKm] = useState<number | null>(null);
  // ペース表で選んだ目標タイムを、体験の絞り込みにも使えるようにする
  const [paceTargetS, setPaceTargetS] = useState<number | null>(null);
  return <>
    <section id="course-map" className="mt-8 scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold sm:text-2xl">コースマップ・GPX</h2>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">{hasCourse ? <RaceCourseMap key={slug} slug={slug} name={name} selectedKm={selectedKm} onSelectKm={setSelectedKm} /> : <p className="rounded-xl bg-cream p-6 text-sm">コースデータは準備中です。最新のコースは大会公式サイトでご確認ください。</p>}</div>
        {courseInfo}
      </div>
    </section>
    <PacePlanner slug={slug} raceName={name} distanceKm={maxKm} hasCourse={hasCourse} onTargetChange={setPaceTargetS} />
    <div className="mt-12 border-t border-line pt-10"><RaceReviews key={slug} slug={slug} distanceLabel={distanceLabel} maxKm={maxKm} initial={initialReviews} suggestedTargetS={paceTargetS} onSelectPoint={hasCourse ? (km) => { setSelectedKm(km); document.getElementById("course-map")?.scrollIntoView({ block: "start" }); } : undefined} /></div>
  </>;
}
