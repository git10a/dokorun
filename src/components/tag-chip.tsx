import Link from "next/link";

export function TagChip({ name, slug, active = false }: { name: string; slug?: string; active?: boolean }) {
  const className = `inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-brand" : "bg-cream hover:bg-brand/45"}`;
  return slug ? <Link href={`/spots?tags=${encodeURIComponent(slug)}`} className={className}>{name}</Link> : <span className={className}>{name}</span>;
}
