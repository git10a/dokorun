import Link from "next/link";
import { notFound } from "next/navigation";
import { RunForm } from "@/components/run-form";
import { getSpotBySlug } from "@/db/data";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function NewRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/spots/${slug}/log/new`);
  const spot = await getSpotBySlug(slug);
  if (!spot) notFound();
  return <div className="mx-auto max-w-2xl px-4 py-10 md:px-6"><Link href={`/spots/${spot.slug}`} className="text-sm font-bold text-accent">← {spot.name}へ戻る</Link><p className="mt-7 text-sm font-bold text-sub">ランログ</p><h1 className="mt-1 text-3xl font-black">走った記録を投稿</h1><p className="mt-3 text-sub">{spot.name}</p><RunForm spot={{ id: spot.id, slug: spot.slug, name: spot.name }} /></div>;
}
