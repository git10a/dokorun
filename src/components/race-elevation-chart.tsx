"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { elevationPointAtDistance, elevationSegments, type RaceElevation } from "@/lib/race-elevation";

const HEIGHT = 220;
const LEFT = 48;
const RIGHT = 20;
const TOP = 22;
const BOTTOM = 36;

export function RaceElevationChart({
  profile,
  selectedDistanceM,
  onSelect,
}: {
  profile: RaceElevation;
  selectedDistanceM: number | null;
  onSelect: (distanceM: number) => void;
}) {
  const hintId = useId();
  const chart = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const hasElevation = profile.points.filter((point) => point.elevationM !== null).length >= 2;
  useEffect(() => {
    if (!chart.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, entry.contentRect.width)));
    observer.observe(chart.current);
    return () => observer.disconnect();
  }, [hasElevation]);
  const values = profile.points.flatMap((point) => (point.elevationM === null ? [] : [point.elevationM]));
  const total = profile.points.at(-1)?.distanceM ?? 0;
  if (values.length < 2 || total <= 0)
    return (
      <div className="mt-3 rounded-xl border border-line bg-paper p-5">
        <h3 className="font-bold">コースの高低差</h3>
        <p className="mt-2 text-sm text-sub">
          このコースの標高データは準備中です。標高を確認できるデータが揃い次第、高低図を表示します。
        </p>
      </div>
    );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  // At least 50 m of vertical range prevents a few meters of noise looking like a mountain.
  const tick = Math.max(10, Math.ceil((maximum - minimum) / 40) * 10);
  const yMin = Math.floor(minimum / tick) * tick;
  const yMax = Math.max(yMin + 50, Math.ceil(maximum / tick) * tick);
  const x = (distance: number) => LEFT + (distance / total) * (width - LEFT - RIGHT);
  const y = (elevation: number) => HEIGHT - BOTTOM - ((elevation - yMin) / (yMax - yMin)) * (HEIGHT - TOP - BOTTOM);
  const selected = selectedDistanceM === null ? null : elevationPointAtDistance(profile.points, selectedDistanceM);
  const segments = elevationSegments(profile.points);
  const distanceLabel = selected ? `${(selected.distanceM / 1000).toFixed(2)} km` : null;
  const elevationLabel = selected?.elevationM != null ? `約 ${Math.round(selected.elevationM)} m` : "標高データなし";
  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const graphX = ((event.clientX - rect.left) / rect.width) * width;
    onSelect(Math.max(0, Math.min(1, (graphX - LEFT) / (width - LEFT - RIGHT))) * total);
  };
  return (
    <div className="mt-3 rounded-xl border border-line bg-paper px-3 py-4 sm:px-5">
      <h3 className="font-bold">コースの高低差</h3>
      <p id={hintId} className="mt-1 text-xs leading-5 text-sub">
        グラフをタップすると、その地点を地図で確認できます。
      </p>
      {profile.routeReviewRequired && (
        <p className="mt-3 rounded-lg border border-brand bg-cream p-3 text-xs leading-5">
          <strong>コースの経路・標高を確認中です。</strong>{" "}
          この参考コースデータは大会公式コースとの照合が必要です。ペース計画に使う前に、大会公式のコース図・高低図をご確認ください。
        </p>
      )}
      <div
        className="mt-3 flex min-h-12 flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-cream px-3 py-2 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {selected ? (
          <>
            <span>
              スタートから <strong className="tabular-nums">{distanceLabel}</strong>
            </span>
            <span>
              標高 <strong className="tabular-nums">{elevationLabel}</strong>
            </span>
          </>
        ) : (
          <>
            <span>
              最低 <strong>約 {Math.round(minimum)} m</strong>
            </span>
            <span>
              最高 <strong>約 {Math.round(maximum)} m</strong>
            </span>
            <span className="text-xs text-sub">標高の差 {Math.round(maximum - minimum)} m</span>
          </>
        )}
      </div>
      <svg
        ref={chart}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="mt-2 h-[200px] w-full cursor-crosshair touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:h-[220px]"
        role="slider"
        tabIndex={0}
        aria-label="高低図の地点を選択"
        aria-describedby={hintId}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(selected?.distanceM ?? 0)}
        aria-valuetext={
          selected
            ? `スタートから ${distanceLabel}、標高 ${elevationLabel}`
            : "地点未選択。左右の矢印キーで100mずつ移動できます。"
        }
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          let distance = selected?.distanceM ?? 0;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") distance += event.shiftKey ? 1000 : 100;
          else if (event.key === "ArrowLeft" || event.key === "ArrowDown") distance -= event.shiftKey ? 1000 : 100;
          else if (event.key === "Home") distance = 0;
          else if (event.key === "End") distance = total;
          else return;
          event.preventDefault();
          onSelect(Math.max(0, Math.min(total, distance)));
        }}
      >
        <g aria-hidden="true">
          {[yMin, (yMin + yMax) / 2, yMax].map((value) => (
            <g key={value}>
              <line x1={LEFT} x2={width - RIGHT} y1={y(value)} y2={y(value)} stroke="#E5E2D9" strokeDasharray="3 4" />
              <text x={LEFT - 8} y={y(value) + 4} textAnchor="end" fontSize="12" fill="#6B7280">
                {Math.round(value)}
              </text>
            </g>
          ))}
          <text x={LEFT - 8} y={12} textAnchor="end" fontSize="11" fill="#6B7280">
            標高 m
          </text>
          {segments.map((segment, index) => {
            const line = segment
              .map((point, i) => `${i ? "L" : "M"}${x(point.distanceM).toFixed(2)},${y(point.elevationM!).toFixed(2)}`)
              .join(" ");
            return (
              <g key={index}>
                <path
                  d={`${line} L${x(segment.at(-1)!.distanceM)},${HEIGHT - BOTTOM} L${x(segment[0].distanceM)},${HEIGHT - BOTTOM} Z`}
                  fill="#FFD900"
                  fillOpacity="0.3"
                />
                <path
                  d={line}
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {[0, total / 4, total / 2, (total * 3) / 4, total].map((value) => (
            <text key={value} x={x(value)} y={HEIGHT - 12} textAnchor="middle" fontSize="12" fill="#6B7280">
              {(value / 1000).toFixed(value === 0 ? 0 : 1)}
            </text>
          ))}
          <text x={width - RIGHT} y={HEIGHT - 1} textAnchor="end" fontSize="10" fill="#6B7280">
            距離 km
          </text>
          {selected && (
            <g>
              <line
                x1={x(selected.distanceM)}
                x2={x(selected.distanceM)}
                y1={TOP}
                y2={HEIGHT - BOTTOM}
                stroke="#1A7DC4"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {selected.elevationM !== null && (
                <circle
                  cx={x(selected.distanceM)}
                  cy={y(selected.elevationM)}
                  r="6"
                  fill="#FFD900"
                  stroke="#1A1A1A"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </g>
      </svg>
      <p className="mt-1 text-[11px] leading-5 text-sub">
        {profile.source === "gsi" ? (
          <>
            地形の高さの目安（橋・トンネルは路面と異なります）。出典：
            <a
              className="underline"
              href="https://maps.gsi.go.jp/development/ichiran.html"
              target="_blank"
              rel="noreferrer"
            >
              国土地理院の標高タイル
            </a>
            を加工
          </>
        ) : (
          "コースデータに記録された標高（測定誤差を含みます）"
        )}
        {values.length < profile.points.length && "。標高データのない区間は線を表示していません"}
      </p>
    </div>
  );
}
