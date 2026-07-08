import Link from "next/link";
import { deleteRunAsAdmin } from "@/app/admin/actions";
import { getAdminRuns } from "@/db/data";

export const dynamic = "force-dynamic";
const formatDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" });

export default async function AdminLogsPage() {
  const items = await getAdminRuns();
  return <div className="mx-auto max-w-5xl px-4 py-10 md:px-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-sub">ADMIN</p><h1 className="text-3xl font-bold">ランログ管理</h1></div><Link href="/admin" className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold">スポット管理へ</Link></div><div className="mt-8 space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border border-line p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-bold">{item.userName} <span className="text-sm font-normal text-sub">{item.userEmail}</span></p><p className="mt-1 text-sm text-sub">投稿: {formatDate.format(item.createdAt)} ・ 走行: {formatDate.format(item.ranAt)} ・ {item.visibility === "public" ? "公開" : "非公開"}</p></div><form action={deleteRunAsAdmin}><input type="hidden" name="id" value={item.id} /><button className="text-sm font-bold text-danger">削除</button></form></div><Link href={`/spots/${item.spotSlug}`} className="mt-3 inline-block font-bold text-accent">{item.spotName}</Link><p className="mt-2">{item.distanceM ? `${(item.distanceM / 1000).toFixed(2)}km` : "距離なし"}</p>{item.comment && <p className="mt-3 whitespace-pre-line leading-7">{item.comment}</p>}</article>)}</div>{!items.length && <p className="mt-8 rounded-xl bg-cream p-10 text-center text-sub">ランログはまだありません</p>}</div>;
}
