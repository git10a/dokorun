import { courseTypeLabels, surfaceLabels, type CourseType, type Lighting, type Surface } from "@/lib/types";

const lightingLabels: Record<Exclude<Lighting, null>, string> = { bright: "夜も明るい", partial: "一部照明あり", dark: "夜は暗い" };

export function SpecPanel({ distanceM, elevationGainM, signalsCount, courseType, surface, lighting }: { distanceM: number; elevationGainM: number | null; signalsCount: number | null; courseType: CourseType; surface: Surface; lighting: Lighting }) {
  const specs = [
    { label: "距離", value: (distanceM / 1000).toFixed(distanceM % 1000 ? 1 : 0), unit: "km" },
    { label: "獲得標高", value: elevationGainM ?? "—", unit: elevationGainM === null ? "" : "m" },
    { label: "信号", value: signalsCount ?? "—", unit: signalsCount === null ? "" : "箇所" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="grid grid-cols-3 divide-x divide-line">{specs.map((spec) => <div key={spec.label} className="px-2 py-6 text-center sm:px-5"><p className="mb-2 text-xs font-bold text-sub sm:text-sm">{spec.label}</p><p className="font-bold leading-none"><span className="text-3xl sm:text-4xl">{spec.value}</span> <span className="text-xs text-sub sm:text-sm">{spec.unit}</span></p></div>)}</div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line bg-cream px-5 py-4 text-sm"><span><b>形状:</b> {courseTypeLabels[courseType]}</span><span><b>路面:</b> {surfaceLabels[surface]}</span>{lighting && <span><b>夜間:</b> {lightingLabels[lighting]}</span>}</div>
    </div>
  );
}
