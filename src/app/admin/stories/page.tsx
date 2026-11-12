import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { deleteArticle } from "./actions";
import { getAdminArticles } from "@/db/articles";
import { DeleteButton } from "@/components/admin/delete-button";
import { formatArticleDate } from "@/components/article-view";
import { requireAdminPage } from "@/lib/auth";
import { raceBySlug } from "@/lib/races";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = { deleted: "記事を削除しました" };

export default async function AdminStoriesPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  await requireAdminPage();
  const [items, params] = await Promise.all([getAdminArticles(), searchParams]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Link href="/admin" className="mb-5 flex items-center gap-1 text-sm text-sub">
        <ChevronLeft size={16} />
        スポット管理へ戻る
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-sub">ADMIN</p>
          <h1 className="text-3xl font-bold">記事管理</h1>
        </div>
        <Link href="/admin/stories/new" className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 font-bold">
          <Plus size={18} />
          記事を書く
        </Link>
      </div>
      {params.success && messages[params.success] && (
        <p className="mt-6 rounded-lg bg-success-soft px-4 py-3 text-sm font-bold text-success">
          {messages[params.success]}
        </p>
      )}
      <div className="mt-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-cream">
            <tr>
              <th className="p-4">タイトル</th>
              <th className="p-4">大会</th>
              <th className="p-4">状態</th>
              <th className="p-4">更新日</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="max-w-md p-4 font-bold">{item.title}</td>
                <td className="p-4">{(item.raceSlug && raceBySlug.get(item.raceSlug)?.name) || "-"}</td>
                <td className="p-4">
                  {item.status === "published" ? (
                    <Link href={`/stories/${item.slug}`} className="font-bold text-success underline">
                      公開中
                    </Link>
                  ) : (
                    "下書き"
                  )}
                </td>
                <td className="p-4 tabular-nums">{formatArticleDate(item.updatedAt)}</td>
                <td className="p-4">
                  <div className="flex gap-4">
                    <Link href={`/admin/stories/${item.id}/edit`} className="font-bold text-accent">
                      編集
                    </Link>
                    <form action={deleteArticle}>
                      <input type="hidden" name="id" value={item.id} />
                      <DeleteButton confirmMessage="この記事を削除しますか？元に戻せません。" />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="p-10 text-center text-sub">記事がありません</p>}
      </div>
    </div>
  );
}
