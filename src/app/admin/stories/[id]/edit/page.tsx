import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAdminArticle } from "@/db/articles";
import { ArticleForm } from "@/components/admin/article-form";
import { ArticlePreviewLink } from "@/components/admin/article-preview-link";
import { requireAdminPage } from "@/lib/auth";
import { racesByCalendar } from "@/lib/races";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  saved: "下書きを保存しました",
  published: "記事を公開しました",
  updated: "公開中の記事を更新しました",
  token: "共有プレビューのURLを作り直しました",
};

// 日本時間の日付を <input type="date"> の値(YYYY-MM-DD)にする
const dateInputValue = (date: Date) => new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default async function EditStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  await requireAdminPage();
  const [{ id }, { success }, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  const article = await getAdminArticle(id);
  if (!article) notFound();
  // 共有URLは、いま管理画面を開いているホストで組み立てる(ローカル確認時に本番のURLを出さない)
  const host = requestHeaders.get("host");
  const origin = host ? `${/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https"}://${host}` : getSiteUrl();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <Link href="/admin/stories" className="mb-5 flex items-center gap-1 text-sm text-sub">
        <ChevronLeft size={16} />
        一覧へ戻る
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">記事を編集</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${article.status === "published" ? "bg-success-soft text-success" : "bg-cream text-sub"}`}
        >
          {article.status === "published" ? "公開中" : "下書き"}
        </span>
        {article.status === "published" && (
          <Link href={`/stories/${article.slug}`} className="text-sm font-bold text-accent underline">
            公開ページを見る
          </Link>
        )}
      </div>
      {success && messages[success] && (
        <p role="status" className="mb-6 rounded-lg bg-success-soft px-4 py-3 text-sm font-bold text-success">
          {messages[success]}
        </p>
      )}
      <div className="mb-10">
        <ArticlePreviewLink id={article.id} url={`${origin}/preview/stories/${article.previewToken}`} />
      </div>
      <ArticleForm
        // 保存後は最新の内容で入力欄を作り直し、「未保存の変更」の判定を戻す
        key={article.updatedAt.getTime()}
        id={article.id}
        status={article.status}
        initial={{
          title: article.title,
          subtitle: article.subtitle ?? "",
          slug: article.slug,
          raceSlug: article.raceSlug ?? "",
          author: article.author,
          speakers: article.speakers ?? "",
          body: article.body,
          coverImageUrl: article.coverImageUrl ?? "",
          seoTitle: article.seoTitle ?? "",
          description: article.description,
          ogTitle: article.ogTitle ?? "",
          ogDescription: article.ogDescription ?? "",
          ogImageUrl: article.ogImageUrl ?? "",
          publishedOn: article.publishedAt ? dateInputValue(article.publishedAt) : "",
        }}
        raceOptions={racesByCalendar.map((race) => ({ slug: race.slug, name: race.name }))}
        siteHost={new URL(getSiteUrl()).host}
      />
    </div>
  );
}
