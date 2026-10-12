import { elevationPointAtDistance, type RaceElevationPoint } from "./race-elevation";
import { formatDuration } from "./format";

export type PacePlanRow = {
  label: string;
  fromKm: number;
  toKm: number;
  splitS: number;
  cumulativeS: number;
  paceS: number;
};
// splitPercent: 後半を前半より何%速くするか(-5〜+5。負なら前半を速く)
// hillEffort: 坂の頑張り具合(-2〜+2)。-2=上りでしっかり落とす、0=標準、+2=上りでもペースを保つ
export type PacePlan = {
  targetS: number;
  distanceKm: number;
  hills: boolean;
  splitPercent: number;
  hillEffort: number;
  km: PacePlanRow[];
  fiveKm: PacePlanRow[];
};
export const SPLIT_PERCENT_RANGE = 5;
export const HILL_EFFORT_RANGE = 2;

// 勾配補正の目安。上り1%で約3.3%遅く、下り1%で約1.8%速い(下りの得は上りの損より小さい)。
// 標高ノイズで極端な配分にならないよう、区間ごとの倍率は0.9〜1.25に収める
const UPHILL_COST = 0.033;
const DOWNHILL_GAIN = 0.018;
// hillEffortは勾配補正の強さを倍率で変える(-2→2倍、0→1倍、+2→0倍=坂を無視したイーブン)
export function gradeFactor(gradePercent: number, hillEffort = 0) {
  const strength = 1 - hillEffort / HILL_EFFORT_RANGE;
  const factor =
    gradePercent >= 0 ? 1 + UPHILL_COST * gradePercent * strength : 1 + DOWNHILL_GAIN * gradePercent * strength;
  return Math.min(1.25, Math.max(0.9, factor));
}

export function splitLabel(splitPercent: number) {
  if (splitPercent === 0) return "イーブン";
  return splitPercent > 0 ? `後半を${splitPercent}%速く` : `前半を${-splitPercent}%速く`;
}

export function hillEffortLabel(hillEffort: number) {
  return (
    ["上りはしっかり抑える", "上りは少し抑える", "標準", "上りも少しがんばる", "上りもペースを保つ"][
      hillEffort + HILL_EFFORT_RANGE
    ] ?? "標準"
  );
}

// 標高のある点が8割未満、または経路確認中のコースは坂の配分に使わない
export function canUseHills(profile: { points: RaceElevationPoint[]; routeReviewRequired?: boolean } | null) {
  if (!profile || profile.routeReviewRequired || profile.points.length < 2) return false;
  return profile.points.filter((point) => point.elevationM !== null).length / profile.points.length >= 0.8;
}

function formatKm(km: number) {
  return Number.isInteger(km) ? `${km}km` : `${Number(km.toFixed(4))}km`;
}

// 公式距離(例: 42.195km)で区切り、参考コースの距離軸には縮尺を合わせて対応させる。
// 参考コースは実測で公式距離とずれることがあるため、標高だけを借りる
export function buildPacePlan({
  targetS,
  distanceKm,
  splitPercent = 0,
  hillEffort = 0,
  points,
}: {
  targetS: number;
  distanceKm: number;
  splitPercent?: number;
  hillEffort?: number;
  points: RaceElevationPoint[] | null;
}): PacePlan {
  const hills = Boolean(points && points.length >= 2);
  const courseM = hills ? points!.at(-1)!.distanceM : 0;
  const scale = hills ? courseM / (distanceKm * 1000) : 0;
  const elevationAt = (km: number) =>
    hills ? (elevationPointAtDistance(points!, km * 1000 * scale)?.elevationM ?? null) : null;

  const segments: { fromKm: number; toKm: number; weight: number }[] = [];
  for (let fromKm = 0; fromKm < distanceKm - 1e-9; fromKm += 1) {
    const toKm = Math.min(distanceKm, fromKm + 1);
    const lengthKm = toKm - fromKm;
    let factor = 1;
    const [start, end] = [elevationAt(fromKm), elevationAt(toKm)];
    if (start !== null && end !== null)
      factor = gradeFactor(((end - start) / (lengthKm * 1000 * scale)) * 100, hillEffort);
    // 前半から後半へ直線的に配分を変え、後半が前半よりおよそsplitPercent%速くなるようにする
    const middle = (fromKm + toKm) / 2 / distanceKm;
    const splitFactor = 1 + (splitPercent / 100) * 2 * (0.5 - middle);
    segments.push({ fromKm, toKm, weight: lengthKm * factor * splitFactor });
  }

  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let cumulative = 0;
  const km = segments.map((segment, index) => {
    // 丸め誤差を最後の区間で吸収し、合計を目標タイムにぴったり合わせる
    const splitS = index === segments.length - 1 ? targetS - cumulative : (targetS * segment.weight) / totalWeight;
    cumulative += splitS;
    return {
      label: formatKm(segment.toKm),
      fromKm: segment.fromKm,
      toKm: segment.toKm,
      splitS,
      cumulativeS: cumulative,
      paceS: splitS / (segment.toKm - segment.fromKm),
    };
  });

  const cumulativeAt = (targetKm: number) => {
    let elapsed = 0;
    for (const row of km) {
      if (targetKm >= row.toKm - 1e-9) {
        elapsed = row.cumulativeS;
        continue;
      }
      return elapsed + (row.splitS * (targetKm - row.fromKm)) / (row.toKm - row.fromKm);
    }
    return elapsed;
  };
  const checkpoints = [
    ...new Set([
      ...Array.from({ length: Math.floor(distanceKm / 5) }, (_, index) => (index + 1) * 5),
      ...(distanceKm > 30 ? [distanceKm / 2] : []),
      distanceKm,
    ]),
  ]
    .filter((value) => value <= distanceKm + 1e-9)
    .sort((a, b) => a - b);
  let previousKm = 0;
  let previousS = 0;
  const fiveKm = checkpoints.map((toKm) => {
    const cumulativeS = cumulativeAt(toKm);
    const halfway = toKm !== distanceKm && Math.abs(toKm - distanceKm / 2) < 1e-9;
    const row = {
      label: toKm === distanceKm ? "ゴール" : halfway ? "中間点" : formatKm(toKm),
      fromKm: previousKm,
      toKm,
      splitS: cumulativeS - previousS,
      cumulativeS,
      paceS: (cumulativeS - previousS) / (toKm - previousKm),
    };
    // 中間点は通過の目安として挟むだけ。次の25kmの区間は20kmから数える
    if (!halfway) {
      previousKm = toKm;
      previousS = cumulativeS;
    }
    return row;
  });

  return { targetS, distanceKm, hills, splitPercent, hillEffort, km, fiveKm };
}

export function pacePlanCondition(plan: PacePlan) {
  return [splitLabel(plan.splitPercent), plan.hills ? `坂：${hillEffortLabel(plan.hillEffort)}` : "坂は考慮なし"].join(
    "・",
  );
}

// メモアプリに貼り付ける用のテキスト
export function pacePlanText(plan: PacePlan, raceName: string) {
  const condition = pacePlanCondition(plan);
  return [
    `${raceName} ペース表（目標 ${formatDuration(plan.targetS, true)}・${condition}）`,
    "",
    "■ 5kmごと（区間 / 通過）",
    ...plan.fiveKm.map((row) =>
      row.label === "中間点"
        ? `${row.label}　通過 ${formatDuration(row.cumulativeS, true)}`
        : `${row.label}　${formatDuration(row.splitS)} / ${formatDuration(row.cumulativeS, true)}`,
    ),
    "",
    "■ 1kmごと（ラップ / 通過）",
    ...plan.km.map((row) => `${row.label}　${formatDuration(row.splitS)} / ${formatDuration(row.cumulativeS, true)}`),
    "",
    "どこラン https://dokorun.com",
  ].join("\n");
}
