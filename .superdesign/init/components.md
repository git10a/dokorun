# Shared components

## `src/components/spot-card.tsx` — SpotCard

Reusable linked card for home and search results. Props: `spot: SpotSummary`.

```tsx
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Footprints } from "lucide-react";
import { FacilityIcons } from "./facility-icons";
import { courseTypeLabels, surfaceLabels, type SpotSummary } from "@/lib/types";

export function SpotCard({ spot }: { spot: SpotSummary }) {
  return (
    <Link href={`/spots/${spot.slug}`} className="group overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-video overflow-hidden bg-brand/25">
        {spot.photoUrl ? <img src={spot.photoUrl} alt={`${spot.name}の写真`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="grid h-full place-items-center text-ink/40"><Footprints size={42} /></div>}
      </div>
      <div className="space-y-2.5 p-4">
        <p className="text-xs text-sub">{spot.prefecture} {spot.city}</p>
        <h3 className="text-lg font-bold leading-snug">{spot.name}</h3>
        <p className="text-sm"><strong className="text-lg text-brand-dark">{(spot.distanceM / 1000).toFixed(spot.distanceM % 1000 ? 1 : 0)}km</strong> ・ {courseTypeLabels[spot.courseType]} ・ {surfaceLabels[spot.surface]}</p>
        <div className="flex min-h-7 flex-wrap gap-1.5">{spot.tags.slice(0, 3).map((tag) => <span key={tag.slug} className="rounded-full bg-cream px-2.5 py-1 text-xs">{tag.name}</span>)}</div>
        <FacilityIcons spot={spot} compact />
      </div>
    </Link>
  );
}
```

## `src/components/tag-chip.tsx` — TagChip

Rounded tag link or label with an active state.

```tsx
import Link from "next/link";
export function TagChip({ name, slug, active = false }: { name: string; slug?: string; active?: boolean }) {
  const className = `inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-brand" : "bg-cream hover:bg-brand/45"}`;
  return slug ? <Link href={`/spots?tags=${encodeURIComponent(slug)}`} className={className}>{name}</Link> : <span className={className}>{name}</span>;
}
```

## `src/components/facility-icons.tsx` — FacilityIcons

Compact or full facility availability display.

```tsx
import { Bath, Coffee, GlassWater, Lock, ShowerHead, SquareParking, Store, Toilet } from "lucide-react";
const facilities = [
  ["hasToilet", "トイレ", Toilet], ["hasWaterFountain", "水飲み場", GlassWater], ["hasVendingMachine", "自販機", Coffee],
  ["hasLocker", "ロッカー", Lock], ["hasShower", "シャワー", ShowerHead], ["hasSentoNearby", "銭湯・サウナ", Bath],
  ["hasParking", "駐車場", SquareParking], ["hasConvenienceStore", "コンビニ", Store],
] as const;
export type FacilityValues = Record<(typeof facilities)[number][0], boolean>;
export function FacilityIcons({ spot, compact = false }: { spot: FacilityValues; compact?: boolean }) {
  if (compact) return <div className="flex gap-2 text-sub" aria-label="利用できる設備">{facilities.filter(([key]) => spot[key]).slice(0, 5).map(([key, label, Icon]) => <Icon key={key} size={17} aria-label={label} />)}</div>;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{facilities.map(([key, label, Icon]) => { const available = spot[key]; return <div key={key} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm ${available ? "border-line bg-paper text-ink" : "border-line/60 bg-cream/60 text-sub/40 line-through"}`}><Icon size={24} /><span>{label}</span></div>; })}</div>;
}
```
