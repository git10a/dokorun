import type { TrackUsage } from "@/lib/types";

const rowDefs: { key: keyof TrackUsage; label: string }[] = [
  { key: "feeText", label: "料金" },
  { key: "openingHoursText", label: "開放時間" },
  { key: "openDaysText", label: "開放日" },
  { key: "closedDaysText", label: "休場日" },
  { key: "reservationText", label: "予約" },
  { key: "spikeRulesText", label: "スパイク" },
  { key: "showerText", label: "シャワー" },
  { key: "lockerText", label: "ロッカー" },
];

const linkDefs: { key: keyof TrackUsage; label: string }[] = [
  { key: "officialUrl", label: "公式サイト" },
  { key: "feeUrl", label: "料金表" },
  { key: "scheduleUrl", label: "開放スケジュール" },
];

const accessBadge = {
  free: { label: "無料開放あり", className: "bg-brand" },
  paid: { label: "有料開放", className: "bg-paper border border-line" },
  unclear: { label: "開放状況要確認", className: "bg-paper border border-line" },
} satisfies Record<TrackUsage["publicAccess"], { label: string; className: string }>;

export function TrackUsagePanel({ usage }: { usage: TrackUsage }) {
  const badge = accessBadge[usage.publicAccess];
  const rows = rowDefs.flatMap(({ key, label }) => {
    const value = usage[key];
    return value ? [{ label, value }] : [];
  });
  const links = linkDefs.flatMap(({ key, label }) => {
    const href = usage[key];
    return href ? [{ label, href }] : [];
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-cream px-5 py-4">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${badge.className}`}>{badge.label}</span>
        <p className="text-sm text-sub">大会・貸切等で利用できない日があります。おでかけ前に公式情報をご確認ください。</p>
      </div>
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-4 px-5 py-3 text-sm">
            <dt className="w-20 shrink-0 font-bold text-sub">{row.label}</dt>
            <dd className="leading-6">{row.value}</dd>
          </div>
        ))}
      </dl>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 border-t border-line px-5 py-4">
          {links.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-bold text-accent hover:bg-cream">
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
