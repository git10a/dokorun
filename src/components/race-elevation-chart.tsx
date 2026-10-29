"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { Info, X } from "lucide-react";
import {
  elevationPointAtDistance,
  elevationSegments,
  raceElevationGain,
  type RaceElevation,
} from "@/lib/race-elevation";
import { raceElevationComparison } from "@/lib/race-elevation-benchmark";
import { courseDistanceTicks, snapCourseDistance } from "@/lib/course-distance";

const HEIGHT = 180;
const RIGHT = 16;
const TOP = 22;
const BOTTOM = 48;

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
  const detailsId = useId();
  const details = useRef<HTMLDivElement>(null);
  const detailsToggle = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const chart = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const elevationGainM = useMemo(() => raceElevationGain(profile), [profile]);
  const comparison = raceElevationComparison(profile, elevationGainM);
  const hasElevation = profile.points.filter((point) => point.elevationM !== null).length >= 2;
  useEffect(() => {
    if (!detailsOpen) return;
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (!details.current?.contains(event.target as Node) && !detailsToggle.current?.contains(event.target as Node))
        setDetailsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDetailsOpen(false);
      detailsToggle.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailsOpen]);
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
  const LEFT = Math.max(30, Math.max(String(yMin).length, String(yMax).length) * 7 + 7);
  const x = (distance: number) => LEFT + (distance / total) * (width - LEFT - RIGHT);
  const y = (elevation: number) => HEIGHT - BOTTOM - ((elevation - yMin) / (yMax - yMin)) * (HEIGHT - TOP - BOTTOM);
  const selected = selectedDistanceM === null ? null : elevationPointAtDistance(profile.points, selectedDistanceM);
  const segments = elevationSegments(profile.points);
  const distanceLabel = selected ? (selected.distanceM / 1000).toFixed(1) : null;
  const elevationLabel = selected?.elevationM != null ? `約 ${Math.round(selected.elevationM)} m` : "標高データなし";
  const distanceTicks = courseDistanceTicks(total, width - LEFT - RIGHT);
  const selectionX = x(selected?.distanceM ?? 0);
  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const graphX = ((event.clientX - rect.left) / rect.width) * width;
    onSelect(snapCourseDistance(Math.max(0, Math.min(1, (graphX - LEFT) / (width - LEFT - RIGHT))) * total, total));
  };
  return (
    <div className="relative mt-3 rounded-xl border border-line bg-paper px-4 pb-4 pt-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <h3 className="text-base font-bold sm:text-lg">コースの高低差</h3>
        <button
          ref={detailsToggle}
          type="button"
          aria-label="詳細データ"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((open) => !open)}
          className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sub hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Info size={20} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={details}
        id={detailsId}
        hidden={!detailsOpen}
        className="absolute right-4 top-14 z-10 w-64 max-w-[calc(100%-2rem)] rounded-lg border border-line bg-paper p-4 text-sm shadow-lg sm:right-6"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold">詳細データ</span>
          <button
            type="button"
            aria-label="詳細を閉じる"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-sub hover:bg-cream focus-visible:outline-2 focus-visible:outline-ink"
            onClick={() => {
              setDetailsOpen(false);
              detailsToggle.current?.focus();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <dl className="space-y-2 text-sub">
          <div className="flex justify-between">
            <dt>{values.length < profile.points.length ? "確認区間の最低" : "最低"}</dt>
            <dd className="font-semibold tabular-nums text-ink">約 {Math.round(minimum)} m</dd>
          </div>
          <div className="flex justify-between">
            <dt>{values.length < profile.points.length ? "確認区間の最高" : "最高"}</dt>
            <dd className="font-semibold tabular-nums text-ink">約 {Math.round(maximum)} m</dd>
          </div>
          <div className="flex justify-between">
            <dt>{values.length < profile.points.length ? "確認区間の標高差" : "標高の差"}</dt>
            <dd className="font-semibold tabular-nums text-ink">{Math.round(maximum - minimum)} m</dd>
          </div>
        </dl>
        {comparison && (
          <p className="mt-2 border-t border-line pt-2 text-xs text-sub">
            掲載{comparison.distanceLabel}
            {comparison.count}大会・平均約{comparison.meanGainM.toLocaleString("ja-JP")}m
          </p>
        )}
      </div>
      {profile.routeReviewRequired && (
        <p className="mt-3 rounded-lg border border-brand bg-cream p-3 text-xs leading-5">
          <strong>コースの経路・標高を確認中です。</strong>{" "}
          この参考コースデータは大会公式コースとの照合が必要です。ペース計画に使う前に、大会公式のコース図・高低図をご確認ください。
        </p>
      )}
      {elevationGainM !== null && (
        <div className="grid grid-cols-2 items-end gap-4 pb-3 pt-1 sm:pb-4">
          <div>
            <p className="mb-1 text-xs text-sub">
              獲得標高<span className="text-[11px]">（推定）</span>
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-sub">約</span>
              <strong className="text-[28px] font-bold leading-none tracking-tight tabular-nums sm:text-[40px]">
                {elevationGainM.toLocaleString("ja-JP")}
              </strong>
              <span className="text-base font-medium">m</span>
            </div>
          </div>
          {comparison && (
            <div className="pb-0.5 text-right">
              <p className="mb-2 text-[11px] text-sub">{comparison.distanceLabel}マラソン平均より</p>
              <p className="text-[20px] font-bold leading-none tracking-tight tabular-nums sm:text-[24px]">
                {comparison.deltaM < 0 ? "−" : comparison.deltaM > 0 ? "+" : ""}
                {Math.abs(comparison.deltaM).toLocaleString("ja-JP")}
                <span className="ml-1 text-sm font-medium">m</span>
              </p>
            </div>
          )}
        </div>
      )}
      <div className="mb-2 flex min-h-14 items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2.5">
        <span className="text-[11px] text-sub sm:text-xs">スタートから</span>
        {selected ? (
          <div className="flex items-baseline gap-1 text-ink">
            <strong className="text-[28px] font-bold leading-none tabular-nums" data-course-distance>
              {distanceLabel}
            </strong>
            <span className="text-sm font-bold">km地点</span>
          </div>
        ) : (
          <span className="text-sm font-bold">高低図で地点を選択</span>
        )}
      </div>
      <svg
        ref={chart}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="my-1 h-[180px] w-full cursor-ew-resize touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        role="slider"
        tabIndex={0}
        aria-label="高低図の地点を選択"
        aria-describedby={hintId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={selected?.distanceM ?? 0}
        aria-valuetext={
          selected
            ? `スタートから ${distanceLabel} km地点、標高 ${elevationLabel}`
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
        onPointerCancel={(event) => {
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
              <text x={LEFT - 7} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#6B7280">
                {Math.round(value)}
              </text>
            </g>
          ))}
          <text x={0} y={10} fontSize="10" fill="#6B7280">
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
                  fillOpacity="0.25"
                />
                <path
                  d={line}
                  fill="none"
                  stroke="#1A1A1A"
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          <line x1={LEFT} x2={width - RIGHT} y1={HEIGHT - BOTTOM} y2={HEIGHT - BOTTOM} stroke="#B4B0A5" />
          {distanceTicks.map(({ distanceM, label }) => (
            <g key={distanceM}>
              <line
                x1={x(distanceM)}
                x2={x(distanceM)}
                y1={HEIGHT - BOTTOM}
                y2={HEIGHT - BOTTOM + (label ? 7 : 4)}
                stroke="#6B7280"
                strokeOpacity="0.6"
              />
              {label && (
                <text x={x(distanceM)} y={HEIGHT - BOTTOM + 24} textAnchor="middle" fontSize="11" fill="#1A1A1A">
                  {label}
                </text>
              )}
            </g>
          ))}
          <text x={LEFT} y={HEIGHT - 1} fontSize="10" fill="#6B7280">
            スタート
          </text>
          <text x={(LEFT + width - RIGHT) / 2} y={HEIGHT - 1} textAnchor="middle" fontSize="10" fill="#6B7280">
            距離 km
          </text>
          <text x={width - RIGHT} y={HEIGHT - 1} textAnchor="end" fontSize="10" fill="#6B7280">
            ゴール
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
                  r="4.5"
                  fill="#FFD900"
                  stroke="#1A1A1A"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
          <g transform={`translate(${selectionX}, ${HEIGHT - BOTTOM})`}>
            <circle r="11" fill="#FFD900" stroke="#1A1A1A" strokeWidth="2" />
            <path d="M-2 -4v8 M2 -4v8" stroke="#1A1A1A" strokeWidth="1.3" />
          </g>
        </g>
      </svg>
      <p id={hintId} className="text-[10px] leading-5 text-sub sm:text-[11px]">
        高低図をなぞると、地図で場所を確認できます
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] leading-5 text-sub sm:text-[11px]">
        {selected && <span>選択地点の標高：{elevationLabel}</span>}
        {profile.attribution ? (
          <a className="underline" href={profile.attribution.url} target="_blank" rel="noreferrer">
            {profile.attribution.label}
          </a>
        ) : profile.source === "gsi" ? (
          <a
            className="underline"
            href="https://maps.gsi.go.jp/development/ichiran.html"
            target="_blank"
            rel="noreferrer"
          >
            国土地理院データを加工
          </a>
        ) : (
          <span>コースデータの標高</span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-5 text-sub sm:text-[11px]">距離は参考コースからの目安です。</p>
      {values.length < profile.points.length && (
        <p className="mt-1 text-[11px] leading-5 text-sub">
          {profile.elevationGapNotice ?? "標高データのない区間は線を表示していません"}
        </p>
      )}
    </div>
  );
}
