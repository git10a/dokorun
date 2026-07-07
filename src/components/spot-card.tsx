import Link from "next/link";
import { FacilityIcons } from "./facility-icons";
import { SpotImage } from "./spot-image";
import { SpotVisual } from "./spot-visual";
import { courseTypeLabels, surfaceLabels, type SpotSummary } from "@/lib/types";

export function SpotCard({ spot }: { spot: SpotSummary }) {
  const distanceKm = (spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0);

  return (
    <Link href={`/spots/${spot.slug}`} className="group flex overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-32 shrink-0 self-stretch overflow-hidden bg-brand/25 sm:w-56">
        {/* eslint-disable-next-line @next/next/no-img-element -- コース地図は生成済みの固定サイズwebpで、変換を挟まず直接配信する */}
        {spot.photoUrl ? <SpotImage src={spot.photoUrl} alt={`${spot.name}の写真`} width={640} height={360} sizes="(min-width: 640px) 224px, 128px" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : spot.hasCourse ? <img src={`/course-maps/${spot.slug}.webp`} alt={`${spot.name}のコース地図`} width={512} height={512} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <SpotVisual slug={spot.slug} distanceM={spot.distanceM} courseType={spot.courseType} tags={spot.tags} className="h-full w-full" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 p-3 sm:space-y-2 sm:p-4">
        <p className="text-xs text-sub">{spot.prefecture} {spot.city}</p>
        <h3 className="text-lg font-bold leading-tight sm:text-xl">{spot.name}</h3>
        <div className="flex gap-4 py-1 sm:gap-6">
          <Spec label="距離" value={distanceKm} unit="km" highlight />
          <Spec label="高低差" value={spot.elevationGainM ?? "−"} unit="m" />
          <Spec label="信号" value={spot.signalsCount ?? "−"} />
        </div>
        <p className="text-sm">{courseTypeLabels[spot.courseType]}・{surfaceLabels[spot.surface]}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {spot.tags.slice(0, 3).map((tag, index) => <span key={tag.slug} className={`rounded-full bg-cream px-2.5 py-1 text-xs ${index === 2 ? "hidden sm:inline-flex" : ""}`}>{tag.name}</span>)}
          <FacilityIcons spot={spot} compact />
        </div>
      </div>
    </Link>
  );
}

function Spec({ label, value, unit, highlight = false }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-sub">{label}</p>
      <p className="flex items-baseline gap-0.5">
        <strong className={`text-xl font-bold sm:text-2xl ${highlight ? "text-brand-dark" : ""}`}>{value}</strong>
        {unit && <span className="text-xs">{unit}</span>}
      </p>
    </div>
  );
}
