import Link from "next/link";
import { getUserFavorites } from "@/db/data";
import { SpotCard } from "@/components/spot-card";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function MyFavoritesPage() {
  const user = await requireUser("/me/favorites");
  const items = await getUserFavorites(user.id);
  return <div className="mx-auto max-w-5xl px-4 py-10 md:px-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-sub">MY PAGE</p><h1 className="mt-1 text-3xl font-black">おすすめ</h1></div><Link href="/me" className="text-sm font-bold text-accent">マイページへ</Link></div><div className="mt-8 grid gap-6 md:grid-cols-2">{items.map((spot) => <SpotCard key={spot.id} spot={spot} />)}</div>{!items.length && <div className="mt-8 rounded-2xl bg-cream p-10 text-center"><p className="font-bold">おすすめはまだありません</p><Link href="/spots" className="mt-4 inline-block text-accent underline">スポットをさがす</Link></div>}</div>;
}
