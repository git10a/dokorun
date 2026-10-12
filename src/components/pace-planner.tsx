"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Minus, Plus, Printer } from "lucide-react";
import { buildPacePlan, canUseHills, HILL_EFFORT_RANGE, hillEffortLabel, pacePlanCondition, pacePlanText, SPLIT_PERCENT_RANGE, splitLabel } from "@/lib/pace-plan";
import { formatDuration } from "@/lib/time-format";
import type { RaceElevation } from "@/lib/race-elevation";
import { track } from "@/lib/track";

type Props = { slug: string; raceName: string; distanceKm: number; hasCourse: boolean; onTargetChange?: (targetS: number) => void };

// 目標タイム(分)の選択肢。入力欄は使わず、プリセット・スライダー・±1分で選ぶ
const TARGETS = {
  full: { min: 120, max: 420, initial: 240, presets: [["サブ3", 179], ["サブ3.5", 209], ["サブ4", 239], ["サブ4.5", 269], ["サブ5", 299]] },
  half: { min: 55, max: 210, initial: 120, presets: [["サブ1:30", 89], ["サブ1:45", 104], ["サブ2", 119], ["サブ2:15", 134], ["サブ2:30", 149]] },
} as const;

const subscribeNothing = () => () => {};

// 時計を持っていない人向けに、目標タイムから1km・5kmごとのペース表を作る。
// ログイン不要。コピーしてメモアプリに貼るか、印刷して当日持っていく
export function PacePlanner({ slug, raceName, distanceKm, hasCourse, onTargetChange }: Props) {
  const targets = distanceKm > 30 ? TARGETS.full : TARGETS.half;
  const [targetMin, setTargetMin] = useState<number>(targets.initial);
  const [splitPercent, setSplitPercent] = useState(0);
  const [hillEffort, setHillEffort] = useState(0);
  const [profile, setProfile] = useState<RaceElevation | null | undefined>(hasCourse ? undefined : null);
  const [view, setView] = useState<"5km" | "1km">("5km");
  const [copied, setCopied] = useState(false);
  const hillsAvailable = canUseHills(profile ?? null);
  // ボタンなしで、目標タイム・スライダーの変更をその場で表に反映する
  const plan = useMemo(() => buildPacePlan({ targetS: targetMin * 60, distanceKm, splitPercent, hillEffort, points: hillsAvailable ? profile!.points : null }), [targetMin, distanceKm, splitPercent, hillEffort, hillsAvailable, profile]);
  // 印刷用カードはbody直下へportalするため、マウント後だけ描画する
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const interacted = useRef(false);

  useEffect(() => {
    if (!hasCourse) return;
    let active = true;
    fetch(`/race-elevation/${slug}.json`).then((response) => response.ok ? response.json() as Promise<RaceElevation> : null).catch(() => null).then((value) => { if (active) setProfile(value); });
    return () => { active = false; };
  }, [hasCourse, slug]);

  useEffect(() => {
    const clear = () => document.body.classList.remove("printing-pace");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  // 操作ごとには送らず、最初に触ったときだけ計測する
  const adjust = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    if (!interacted.current) {
      interacted.current = true;
      track("pace_plan_create", { race: slug, hills: hillsAvailable });
    }
  };
  const changeTarget = adjust((value: number) => {
    const next = Math.min(targets.max, Math.max(targets.min, value));
    setTargetMin(next);
    onTargetChange?.(next * 60);
  });

  const copy = async () => {
    const text = pacePlanText(plan, raceName);
    track("pace_plan_copy", { race: slug, targetMin, splitPercent, hillEffort });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("このテキストをコピーしてください", text);
    }
  };

  const print = () => {
    track("pace_plan_print", { race: slug, targetMin, splitPercent, hillEffort });
    document.body.classList.add("printing-pace");
    window.print();
  };

  const rows = view === "5km" ? plan.fiveKm : plan.km;
  const condition = pacePlanCondition(plan);

  return <section id="pace" className="mt-12 scroll-mt-24">
    <h2 className="border-l-4 border-brand pl-3 text-xl font-bold sm:text-2xl">ペース表をつくる</h2>
    <div className="mt-4 rounded-2xl bg-cream p-4 sm:p-5">
      <p className="text-sm font-bold">目標タイム</p>
      <div className="mt-2 flex items-center justify-center gap-4">
        <button type="button" onClick={() => changeTarget(targetMin - 1)} aria-label="1分短くする" className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-paper hover:bg-brand/30"><Minus size={20} /></button>
        <output aria-live="polite" className="min-w-[6.5rem] text-center text-4xl font-black tabular-nums">{formatDuration(targetMin * 60, true).replace(/:00$/, "")}</output>
        <button type="button" onClick={() => changeTarget(targetMin + 1)} aria-label="1分長くする" className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-paper hover:bg-brand/30"><Plus size={20} /></button>
      </div>
      <input type="range" min={targets.min} max={targets.max} step={1} value={targetMin} onChange={(event) => changeTarget(Number(event.target.value))} aria-label="目標タイム" aria-valuetext={formatDuration(targetMin * 60, true)} className="mt-3 w-full accent-ink" />
      <div className="mt-2 grid grid-cols-5 gap-1.5 sm:mx-auto sm:max-w-md">{targets.presets.map(([label, minutes]) => <button key={label} type="button" onClick={() => changeTarget(minutes)} aria-pressed={targetMin === minutes} className={`rounded-full border px-1 py-1.5 text-[11px] font-bold sm:text-xs ${targetMin === minutes ? "border-ink bg-ink text-white" : "border-line bg-paper hover:bg-brand/30"}`}>{label}</button>)}</div>
      <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2 sm:gap-8">
        <PaceSlider id={`${slug}-split`} label="配分" valueLabel={splitLabel(splitPercent)} min={-SPLIT_PERCENT_RANGE} max={SPLIT_PERCENT_RANGE} value={splitPercent} onChange={adjust(setSplitPercent)} leftLabel="前半から攻める" rightLabel="後半に上げる" />
        <PaceSlider id={`${slug}-hill`} label="坂の頑張り具合" valueLabel={profile === undefined ? "読み込み中…" : hillsAvailable ? hillEffortLabel(hillEffort) : "このコースでは使えません"} min={-HILL_EFFORT_RANGE} max={HILL_EFFORT_RANGE} value={hillEffort} onChange={adjust(setHillEffort)} leftLabel="上りは抑える" rightLabel="上りもがんばる" disabled={!hillsAvailable} />
      </div>
      <PaceBars plan={plan} />
      {profile !== undefined && !hillsAvailable && <p className="mt-4 text-xs leading-5 text-sub">このコースは標高を確認中のため、坂を考慮せずに配分します。</p>}
    </div>

    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-line text-sm font-bold" role="tablist" aria-label="ペース表の区切り">{(["5km", "1km"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)} className={`px-4 py-2 ${view === value ? "bg-ink text-white" : "bg-paper"}`}>{value}ごと</button>)}</div>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-bold hover:bg-cream">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "コピーしました" : "コピー"}</button>
          <button type="button" onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-bold hover:bg-cream"><Printer size={16} />印刷</button>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-cream text-xs text-sub"><tr><th className="px-3 py-2 text-left font-bold">地点</th><th className="px-3 py-2 text-right font-bold">{view === "5km" ? "区間" : "ラップ"}</th><th className="px-3 py-2 text-right font-bold">ペース/km</th><th className="px-3 py-2 text-right font-bold">通過</th></tr></thead>
          <tbody className="divide-y divide-line">{rows.map((row) => <tr key={row.label} className={row.label === "中間点" || row.label === "ゴール" ? "font-bold" : undefined}><td className="px-3 py-2">{row.label}</td><td className="px-3 py-2 text-right">{row.label === "中間点" ? "–" : formatDuration(row.splitS)}</td><td className="px-3 py-2 text-right text-sub">{row.label === "中間点" ? "–" : formatDuration(row.paceS)}</td><td className="px-3 py-2 text-right font-bold">{formatDuration(row.cumulativeS, true)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-sub">距離は大会の公式距離に合わせた目安です。</p>

      {/* 印刷専用カード。body直下に出し、印刷時はこれ以外を隠す(globals.cssのprinting-pace) */}
      {mounted && createPortal(<div id="pace-print">
        <p className="text-[11pt] font-bold">{raceName}　目標 {formatDuration(plan.targetS, true)}</p>
        <p className="text-[8pt]">{condition}・平均 {formatDuration(plan.targetS / plan.distanceKm)}/km</p>
        <table className="mt-[2mm] w-full text-[9pt] tabular-nums"><tbody>{plan.fiveKm.map((row) => <tr key={row.label}><td className="pr-[3mm] font-bold">{row.label}</td><td className="text-right">{formatDuration(row.cumulativeS, true)}</td></tr>)}</tbody></table>
        <div className="mt-[2mm] columns-3 gap-[3mm] border-t border-black pt-[2mm] text-[7.5pt] leading-[1.35] tabular-nums">{plan.km.map((row) => <div key={row.label} className="flex justify-between gap-[1mm] break-inside-avoid"><span>{row.label.replace("km", "")}</span><span>{formatDuration(row.cumulativeS, true)}</span></div>)}</div>
        <p className="mt-[2mm] text-[6.5pt]">どこラン dokorun.com　※通過タイムの目安です</p>
      </div>, document.body)}
    </div>
  </section>;
}

function PaceSlider({ id, label, valueLabel, min, max, value, onChange, leftLabel, rightLabel, disabled = false }: { id: string; label: string; valueLabel: string; min: number; max: number; value: number; onChange: (value: number) => void; leftLabel: string; rightLabel: string; disabled?: boolean }) {
  return <div className={disabled ? "opacity-50" : undefined}>
    <div className="flex items-baseline justify-between gap-2 text-sm"><label htmlFor={id} className="font-bold">{label}</label><span className="text-xs font-bold text-accent">{valueLabel}</span></div>
    <input id={id} type="range" min={min} max={max} step={1} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-valuetext={valueLabel} className="mt-2 w-full accent-ink disabled:cursor-not-allowed" />
    <div className="mt-1 flex justify-between text-[11px] text-sub"><span>{leftLabel}</span><button type="button" disabled={disabled} onClick={() => onChange(0)} className="underline underline-offset-2 disabled:no-underline">{min < 0 && max > 0 ? "中央に戻す" : ""}</button><span>{rightLabel}</span></div>
  </div>;
}

// スライダーを動かすと形が変わる、1kmごとのペースの棒グラフ。高いほどゆっくり。平均ペース±8%の範囲で描く
function PaceBars({ plan }: { plan: ReturnType<typeof buildPacePlan> }) {
  const average = plan.targetS / plan.distanceKm;
  const halfway = plan.fiveKm.find((row) => row.label === "中間点") ?? plan.fiveKm.find((row) => row.toKm >= plan.distanceKm / 2);
  const width = plan.km.length * 10;
  return <div className="mt-5 rounded-xl bg-paper p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs"><span className="font-bold">1kmごとのペース</span><span className="tabular-nums text-sub">平均 <b className="text-ink">{formatDuration(average)}</b>/km{halfway && <>・中間点 <b className="text-ink">{formatDuration(halfway.cumulativeS, true)}</b></>}</span></div>
    <svg viewBox={`0 0 ${width} 56`} preserveAspectRatio="none" className="mt-2 h-14 w-full" aria-hidden="true">
      <line x1="0" x2={width} y1="28" y2="28" stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
      {plan.km.map((row, index) => {
        const ratio = Math.max(-1, Math.min(1, (row.paceS / average - 1) / 0.08));
        const height = 28 + ratio * 24;
        return <rect key={row.label} x={index * 10 + 1} y={56 - height} width={8} height={height} rx={1.5} className={ratio > 0.05 ? "fill-ink/70" : ratio < -0.05 ? "fill-brand-dark" : "fill-ink/35"} style={{ transition: "y 150ms ease-out, height 150ms ease-out" }} />;
      })}
    </svg>
    <div className="mt-1 flex justify-between text-[10px] text-sub"><span>スタート</span><span>高い棒ほどゆっくり</span><span>ゴール</span></div>
  </div>;
}
