import type { ElevationSample } from "@/lib/gpx";
import type { CourseGuideCheckpoint } from "@/lib/course-guides";

const width = 800;
const height = 190;
const padX = 38;
const padTop = 18;
const padBottom = 32;

export function ElevationProfile({ profile, checkpoints, totalDistanceM, startName }: {
  profile: ElevationSample[];
  checkpoints: Array<CourseGuideCheckpoint & { displayDistanceM: number }>;
  totalDistanceM: number;
  startName: string;
}) {
  const elevations = profile.map((sample) => sample.elevationM);
  const min = Math.floor(Math.min(...elevations) / 10) * 10;
  const max = Math.ceil(Math.max(...elevations) / 10) * 10;
  const chartWidth = width - padX * 2;
  const chartHeight = height - padTop - padBottom;
  const x = (distanceM: number) => padX + (distanceM / totalDistanceM) * chartWidth;
  const y = (elevationM: number) => padTop + (1 - (elevationM - min) / Math.max(1, max - min)) * chartHeight;
  const path = profile.map((sample, index) => `${index ? "L" : "M"}${x(sample.distanceM).toFixed(1)} ${y(sample.elevationM).toFixed(1)}`).join(" ");
  const area = `${path} L${x(totalDistanceM)} ${padTop + chartHeight} L${padX} ${padTop + chartHeight} Z`;
  const tickDistances = [...new Set([0, 5_000, 10_000, 15_000, 20_000, totalDistanceM].filter((value) => value <= totalDistanceM))];
  return (
    <figure className="rounded-2xl border border-line bg-paper p-4 sm:p-6">
      <figcaption className="mb-3 flex flex-wrap items-end justify-between gap-2"><span className="font-bold">高低図</span><span className="text-xs text-sub">{startName}を0kmとして表示・最高約{max}m / 最低約{min}m</span></figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="elevation-title elevation-desc" className="h-auto w-full overflow-visible">
        <title id="elevation-title">{`${startName}から始めた場合のコース高低図`}</title>
        <desc id="elevation-desc">{`全長${(totalDistanceM / 1000).toFixed(1)}キロメートル。標高は約${min}メートルから${max}メートルです。`}</desc>
        <line x1={padX} y1={padTop + chartHeight} x2={width - padX} y2={padTop + chartHeight} stroke="#E5E2D9" />
        <line x1={padX} y1={padTop} x2={padX} y2={padTop + chartHeight} stroke="#E5E2D9" />
        <path d={area} fill="#FFD900" fillOpacity="0.24" />
        <path d={path} fill="none" stroke="#1A1A1A" strokeWidth="3" strokeLinejoin="round" />
        {tickDistances.map((distance) => <g key={distance}><line x1={x(distance)} y1={padTop + chartHeight} x2={x(distance)} y2={padTop + chartHeight + 5} stroke="#6B7280" /><text x={x(distance)} y={height - 8} textAnchor={distance === 0 ? "start" : distance === totalDistanceM ? "end" : "middle"} fontSize="11" fill="#6B7280">{distance === totalDistanceM ? (distance / 1000).toFixed(1) : Math.round(distance / 1000)}km</text></g>)}
        <text x={padX - 8} y={padTop + 5} textAnchor="end" fontSize="10" fill="#6B7280">{max}m</text>
        <text x={padX - 8} y={padTop + chartHeight} textAnchor="end" fontSize="10" fill="#6B7280">{min}m</text>
        {checkpoints.map((checkpoint, index) => checkpoint.elevationM === null ? null : <g key={checkpoint.id}><circle cx={x(checkpoint.displayDistanceM)} cy={y(checkpoint.elevationM)} r="6" fill="#FFD900" stroke="#1A1A1A" strokeWidth="2"><title>{`${index + 1}. ${checkpoint.name}・${(checkpoint.displayDistanceM / 1000).toFixed(1)}km`}</title></circle><text x={x(checkpoint.displayDistanceM)} y={y(checkpoint.elevationM) - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1A1A1A">{index + 1}</text></g>)}
      </svg>
    </figure>
  );
}
