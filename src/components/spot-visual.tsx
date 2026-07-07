import type { CourseType } from "@/lib/types";

/** slugから決定的なハッシュ(FNV-1a)。同一スポットは常に同じ見た目になる。 */
function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** タグのカテゴリで背景の基準色相を決める。デザイントークンの色域(黄=brand/青=accent)を中心に配色。 */
function baseHue(tagSlugs: Set<string>): number {
  if (["waterside", "riverside", "water-refill"].some((s) => tagSlugs.has(s))) return 202; // accent系の青
  if (["park", "cherry-blossoms", "shaded"].some((s) => tagSlugs.has(s))) return 138; // 緑
  if (["track", "dedicated-lane"].some((s) => tagSlugs.has(s))) return 258; // 紫
  if (["cross-country", "dirt-path", "scenic"].some((s) => tagSlugs.has(s))) return 28; // 土・暖色
  return 50; // brandの黄
}

/** courseTypeを表すシンプルなコースライン。viewBox 0 0 320 180 前提。 */
function CourseMotif({ courseType }: { courseType: CourseType }) {
  const stroke = "#ffffff";
  const common = { fill: "none", stroke, strokeWidth: 13, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, opacity: 0.42 };
  if (courseType === "track") {
    return (
      <g>
        <rect x="40" y="46" width="240" height="88" rx="44" {...common} />
        <rect x="72" y="66" width="176" height="48" rx="24" {...common} opacity={0.24} strokeWidth={9} />
      </g>
    );
  }
  if (courseType === "loop") {
    return (
      <g>
        <ellipse cx="160" cy="90" rx="118" ry="56" {...common} />
        <circle cx="278" cy="90" r="11" fill={stroke} opacity={0.7} />
      </g>
    );
  }
  if (courseType === "out_and_back") {
    return (
      <g>
        <path d="M46 90 H274" {...common} />
        <circle cx="46" cy="90" r="12" fill={stroke} opacity={0.7} />
        <path d="M258 74 L282 90 L258 106" {...common} strokeWidth={12} />
      </g>
    );
  }
  // one_way
  return (
    <g>
      <path d="M30 142 C 116 44, 196 150, 288 50" {...common} />
      <path d="M270 44 L292 48 L280 68" {...common} strokeWidth={12} />
    </g>
  );
}

export function SpotVisual({
  slug,
  distanceM,
  courseType,
  tags,
  className,
}: {
  slug: string;
  distanceM: number;
  courseType: CourseType;
  tags: { slug: string }[];
  className?: string;
}) {
  const hash = hashSlug(slug);
  const hue = (baseHue(new Set(tags.map((tag) => tag.slug))) + (hash % 30) - 15 + 360) % 360;
  const c1 = `hsl(${hue} 46% 86%)`;
  const c2 = `hsl(${(hue + 26) % 360} 54% 74%)`;
  const gradId = `sv-${hash.toString(36)}`;
  const km = (distanceM / 1000).toFixed(distanceM % 1000 ? 1 : 0);
  return (
    <svg viewBox="0 0 320 180" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gradId})`} />
      <CourseMotif courseType={courseType} />
      <text x="24" y="150" fontSize="60" fontWeight="900" fill="#ffffff" opacity="0.92" style={{ letterSpacing: "-0.02em" }}>
        {km}
        <tspan fontSize="26" dx="4">km</tspan>
      </text>
    </svg>
  );
}
