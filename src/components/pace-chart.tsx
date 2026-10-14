"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { formatDuration } from "@/lib/format";
import type { PacePlan } from "@/lib/pace-plan";

const HEIGHT = 190;
const LEFT = 42;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 30;
const distanceText = (km: number) => Number(km.toFixed(3));

export function PaceChart({ plan }: { plan: PacePlan }) {
  const hintId = useId();
  const chart = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    if (!chart.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, entry.contentRect.width)));
    observer.observe(chart.current);
    return () => observer.disconnect();
  }, []);

  const selected = plan.km[Math.min(selectedIndex, plan.km.length - 1)];
  if (!selected) return null;
  const average = plan.targetS / plan.distanceKm;
  const halfway = plan.fiveKm.find((row) => row.label === "中間点");
  const paces = plan.km.map((row) => row.paceS);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const tick = Math.max(15, Math.ceil((slowest - fastest) / 4 / 15) * 15);
  const yMin = Math.floor((fastest - 10) / tick) * tick;
  // 小さな差を大きなアップダウンに見せないよう、縦軸には最低1分/kmの幅を持たせる。
  const yMax = Math.max(yMin + Math.max(60, tick * 4), Math.ceil((slowest + 10) / tick) * tick);
  const x = (km: number) => LEFT + (km / plan.distanceKm) * (width - LEFT - RIGHT);
  // 速いペース（秒/kmが小さい）ほど上に置く。
  const y = (pace: number) => TOP + ((pace - yMin) / (yMax - yMin)) * (HEIGHT - TOP - BOTTOM);
  const yTicks = Array.from({ length: Math.round((yMax - yMin) / tick) + 1 }, (_, i) => yMin + tick * i);
  const kmStep = plan.distanceKm > 30 ? 10 : 5;
  const xTicks = [
    0,
    ...Array.from({ length: Math.floor(plan.distanceKm / kmStep) }, (_, i) => (i + 1) * kmStep).filter(
      (km) => x(plan.distanceKm) - x(km) > 48,
    ),
    plan.distanceKm,
  ];
  // 1km区間のペースを水平線で表す。最後の端数区間も実際の距離幅で描く。
  const line = plan.km
    .map((row, i) => `${i === 0 ? "M" : "L"}${x(row.fromKm)},${y(row.paceS)} H${x(row.toKm)}`)
    .join(" ");
  const selectedText = `${distanceText(selected.fromKm)}–${distanceText(selected.toKm)}km`;
  const selectFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const graphX = ((event.clientX - rect.left) / rect.width) * width;
    const km = ((graphX - LEFT) / (width - LEFT - RIGHT)) * plan.distanceKm;
    setSelectedIndex(Math.max(0, Math.min(plan.km.length - 1, Math.floor(km))));
  };

  return (
    <div className="mt-5 rounded-xl bg-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold">1kmごとの目標ペース</h3>
        <span className="text-xs tabular-nums text-sub">
          平均 <b className="text-ink">{formatDuration(average)}</b>/km
          {halfway && (
            <> ・中間点 <b className="text-ink">{formatDuration(halfway.cumulativeS, true)}</b></>
          )}
        </span>
      </div>
      <div className="mt-4 flex justify-between text-[11px] text-sub">
        <span>ペース（分/km）</span>
        <span>↑ 速く　↓ ゆっくり</span>
      </div>
      <svg
        ref={chart}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block h-[190px] w-full touch-pan-y rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        role="slider"
        tabIndex={0}
        aria-label="目標ペースの区間を選択"
        aria-describedby={hintId}
        aria-valuemin={1}
        aria-valuemax={plan.km.length}
        aria-valuenow={Math.min(selectedIndex + 1, plan.km.length)}
        aria-valuetext={`${selectedText}、${formatDuration(selected.paceS)}/km`}
        onPointerDown={selectFromPointer}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons === 1) selectFromPointer(event);
        }}
        onKeyDown={(event) => {
          let next = selectedIndex;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") next += 1;
          else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= 1;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = plan.km.length - 1;
          else return;
          event.preventDefault();
          setSelectedIndex(Math.max(0, Math.min(plan.km.length - 1, next)));
        }}
      >
        <g aria-hidden="true">
          {yTicks.map((pace) => (
            <g key={pace}>
              <line x1={LEFT} x2={width - RIGHT} y1={y(pace)} y2={y(pace)} className="stroke-line" />
              <text x={LEFT - 8} y={y(pace) + 4} textAnchor="end" className="fill-sub text-[11px]">
                {formatDuration(pace)}
              </text>
            </g>
          ))}
          <rect
            x={x(selected.fromKm)}
            y={TOP}
            width={Math.max(2, x(selected.toKm) - x(selected.fromKm))}
            height={HEIGHT - TOP - BOTTOM}
            className="fill-brand/25"
          />
          <line
            x1={LEFT}
            x2={width - RIGHT}
            y1={y(average)}
            y2={y(average)}
            className="stroke-sub"
            strokeDasharray="5 4"
          />
          <path d={line} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" />
          <circle
            cx={x((selected.fromKm + selected.toKm) / 2)}
            cy={y(selected.paceS)}
            r={4}
            className="fill-brand stroke-ink"
            strokeWidth={1.5}
          />
          {xTicks.map((km, i) => (
            <text
              key={km}
              x={x(km)}
              y={HEIGHT - 7}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-sub text-[11px]"
            >
              {i === xTicks.length - 1 ? `${Number(km.toFixed(1))}km` : `${km}km`}
            </text>
          ))}
        </g>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <p className="inline-flex items-baseline gap-2 tabular-nums">
          <span className="text-sub">{selectedText}</span>
          <span><strong className="text-base">{formatDuration(selected.paceS)}</strong> /km</span>
        </p>
        <span className="inline-flex items-center gap-1.5 text-sub">
          <span className="w-5 border-t border-dashed border-sub" aria-hidden="true" />
          点線：平均ペース
        </span>
      </div>
      <p id={hintId} className="mt-2 text-[11px] text-sub">
        グラフをタップすると、その区間のペースを確認できます。
      </p>
    </div>
  );
}
