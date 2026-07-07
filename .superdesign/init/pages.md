# Page dependency trees

## `/`
- `src/app/page.tsx`
  - `src/components/spot-card.tsx`
    - `src/components/facility-icons.tsx`
    - `src/lib/types.ts`
  - `src/components/tag-chip.tsx`
  - `src/db/data.ts`

## `/spots`
- `src/app/spots/page.tsx`
  - `src/components/search-filters.tsx`
  - `src/components/spot-card.tsx`
    - `src/components/facility-icons.tsx`
    - `src/lib/types.ts`
  - `src/components/map/spots-map-shell.tsx`
    - `src/components/map/spots-map.tsx`
    - `src/lib/types.ts`
  - `src/db/data.ts`

## `/spots/[slug]`
- `src/app/spots/[slug]/page.tsx`
  - `src/components/map/course-map.tsx`
  - `src/components/facility-icons.tsx`
  - `src/components/hashiritai-button.tsx`
  - `src/components/spec-panel.tsx`
  - `src/components/spot-card.tsx`
  - `src/db/data.ts`
