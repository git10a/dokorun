import Link from "next/link";
import { Lock } from "lucide-react";
import { DeleteRunForm } from "@/components/delete-run-button";
import { getUserRuns } from "@/db/data";
import { requireUser } from "@/lib/user";

export const dynamic = "force-dynamic";
const dateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

export default async function MyLogsPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const [user, params] = await Promise.all([requireUser("/me/logs"), searchParams]);
  const items = await getUserRuns(user.id);
  return <div className="mx-auto max-w-4xl px-4 py-10 md:px-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-sub">MY PAGE</p><h1 className="mt-1 text-3xl font-black">走った記録・ランログ</h1></div><Link href="/me" className="text-sm font-bold text-accent">マイページへ</Link></div>{params.success === "updated" && <p className="mt-6 rounded-lg bg-cream px-4 py-3 font-bold">記録を更新しました</p>}{params.success === "deleted" && <p className="mt-6 rounded-lg bg-cream px-4 py-3 font-bold">記録を削除しました</p>}<div className="mt-8 space-y-4">{items.map((item) => <article key={item.id} className="rounded-xl border border-line p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={`/spots/${item.spotSlug}`} className="font-bold text-accent">{item.spotName}</Link><p className="mt-1 text-sm text-sub">{dateFormat.format(item.ranAt)}</p></div>{item.visibility === "private" && <span className="flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-bold"><Lock size={13} />非公開</span>}</div>{item.comment ? <p className="mt-3 whitespace-pre-line leading-7">{item.comment}</p> : <p className="mt-3 text-sm text-sub">走ったよ 🏃</p>}<div className="mt-4 flex gap-4 text-sm font-bold"><Link href={`/me/logs/${item.id}/edit`} className="text-accent">編集</Link><DeleteRunForm id={item.id} returnTo="me" /></div></article>)}</div>{!items.length && <div className="mt-8 rounded-2xl bg-cream p-10 text-center"><p className="font-bold">走った記録はまだありません</p><Link href="/spots" className="mt-4 inline-block text-accent underline">走る場所をさがす</Link></div>}</div>;
}
