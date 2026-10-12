import {
  Bath,
  Coffee,
  GlassWater,
  Lock,
  ShowerHead,
  SquareParking,
  Store,
  Toilet,
  type LucideIcon,
} from "lucide-react";
import { facilityKeys, facilityLabels, type FacilityKey, type FacilityValues } from "@/lib/types";

export type { FacilityValues };

const icons: Record<FacilityKey, LucideIcon> = {
  hasToilet: Toilet,
  hasWaterFountain: GlassWater,
  hasVendingMachine: Coffee,
  hasLocker: Lock,
  hasShower: ShowerHead,
  hasSentoNearby: Bath,
  hasParking: SquareParking,
  hasConvenienceStore: Store,
};
const facilities = facilityKeys.map((key) => [key, facilityLabels[key], icons[key]] as const);

export function FacilityIcons({ spot, compact = false }: { spot: FacilityValues; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex gap-1.5 text-sub" aria-label="利用できる設備">
        {facilities
          .filter(([key]) => spot[key])
          .slice(0, 5)
          .map(([key, label, Icon]) => (
            <span key={key} title={label}>
              <Icon size={15} aria-label={label} />
            </span>
          ))}
      </div>
    );
  }
  const available = facilities.filter(([key]) => spot[key]);
  const missing = facilities.filter(([key]) => !spot[key]);
  return (
    <div className="space-y-3">
      {available.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {available.map(([key, label, Icon]) => (
            <li
              key={key}
              className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-bold"
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-sub">確認できている設備はありません</p>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-sub">なし・未確認：{missing.map(([, label]) => label).join("、")}</p>
      )}
    </div>
  );
}
