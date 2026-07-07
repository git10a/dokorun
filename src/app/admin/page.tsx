import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteSpot, logout } from "./actions";
import { getAdminSpots } from "@/db/data";
import { DeleteButton } from "@/components/admin/delete-button";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = { login: "ログインしました", created: "スポットを登録しました", updated: "スポットを更新しました", deleted: "スポットを削除しました" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const [items, params] = await Promise.all([getAdminSpots(), searchParams]);
  return <div className="mx-auto max-w-6xl px-4 py-10 md:px-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-sub">ADMIN</p><h1 className="text-3xl font-bold">スポット管理</h1></div><div className="flex gap-3"><form action={logout}><button className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold">ログアウト</button></form><Link href="/admin/spots/new" className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-bold"><Plus size={18} />新規登録</Link></div></div>{params.success && messages[params.success] && <p className="mt-6 rounded-lg bg-[#EAF7ED] px-4 py-3 text-sm font-bold text-[#207235]">{messages[params.success]}</p>}<div className="mt-8 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-cream"><tr><th className="p-4">名前</th><th className="p-4">都道府県</th><th className="p-4">距離</th><th className="p-4">公開</th><th className="p-4">操作</th></tr></thead><tbody className="divide-y divide-line">{items.map((item) => <tr key={item.id}><td className="p-4 font-bold">{item.name}</td><td className="p-4">{item.prefecture}</td><td className="p-4">{(item.distanceM / 1000).toFixed(1)}km</td><td className="p-4">{item.isPublished ? "公開" : "非公開"}</td><td className="p-4"><div className="flex gap-4"><Link href={`/admin/spots/${item.id}/edit`} className="font-bold text-accent">編集</Link><form action={deleteSpot}><input type="hidden" name="id" value={item.id} /><DeleteButton /></form></div></td></tr>)}</tbody></table>{!items.length && <p className="p-10 text-center text-sub">スポットがありません</p>}</div></div>;
}
