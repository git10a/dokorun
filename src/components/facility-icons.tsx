import { Bath, Coffee, GlassWater, Lock, ShowerHead, SquareParking, Store, Toilet } from "lucide-react";

const facilities = [
  ["hasToilet", "トイレ", Toilet], ["hasWaterFountain", "水飲み場", GlassWater], ["hasVendingMachine", "自販機", Coffee],
  ["hasLocker", "ロッカー", Lock], ["hasShower", "ランステ", ShowerHead], ["hasSentoNearby", "銭湯・サウナ", Bath],
  ["hasParking", "駐車場", SquareParking], ["hasConvenienceStore", "コンビニ", Store],
] as const;

export type FacilityValues = Record<(typeof facilities)[number][0], boolean>;

export function FacilityIcons({ spot, compact = false }: { spot: FacilityValues; compact?: boolean }) {
  if (compact) {
    return <div className="flex gap-2 text-sub" aria-label="利用できる設備">{facilities.filter(([key]) => spot[key]).slice(0, 5).map(([key, label, Icon]) => <Icon key={key} size={17} aria-label={label} />)}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {facilities.map(([key, label, Icon]) => {
        const available = spot[key];
        return <div key={key} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm ${available ? "border-line bg-paper text-ink" : "border-line/60 bg-cream/60 text-sub/40 line-through"}`}><Icon size={24} /><span>{label}</span></div>;
      })}
    </div>
  );
}
