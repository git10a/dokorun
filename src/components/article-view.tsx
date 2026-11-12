/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, Map, Route } from "lucide-react";
import type { Article, ArticleSummary } from "@/db/articles";
import { ArticleBody } from "@/components/article-body";
import { Breadcrumb } from "@/components/breadcrumb";
import { articleHeadings, parseArticleBody, type ArticleBlock } from "@/lib/article-body";
import { raceBySlug } from "@/lib/races";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** 日本時間の日付を 2026.11.12 の形で返す */
export function formatArticleDate(date: Date) {
  return dateFormat.format(date).replaceAll("/", ".");
}

function Contents({ headings }: { headings: Extract<ArticleBlock, { type: "heading" }>[] }) {
  return (
    <ol className="space-y-1">
      {headings.map((heading, index) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={`flex min-h-11 items-start gap-3 py-2.5 text-sm leading-6 transition-colors hover:text-accent ${focus}`}
          >
            <span className="font-bold tabular-nums text-sub">{String(index + 1).padStart(2, "0")}</span>
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function ArticleView({ article, preview = false }: { article: Article; preview?: boolean }) {
  const race = article.raceSlug ? raceBySlug.get(article.raceSlug) : undefined;
  const blocks = parseArticleBody(article.body, article.speakers);
  const headings = articleHeadings(blocks);
  return (
    <div className="mx-auto max-w-[760px] px-[22px] pb-12 pt-6 sm:px-[30px] sm:pt-10">
      {preview && (
        <div
          role="note"
          className="mb-6 rounded-lg border border-brand bg-brand/10 px-4 py-3 text-xs leading-6 sm:text-sm"
        >
          <strong>記事のプレビュー</strong>
          <span className="ml-2">
            {article.status === "published"
              ? "公開中の記事を確認用のURLで表示しています。"
              : "公開前の記事です。このURLを知っている方だけが閲覧できます。"}
          </span>
        </div>
      )}

      <Breadcrumb
        items={[
          { name: "ホーム", href: "/" },
          { name: "大会からさがす", href: "/races" },
          ...(race ? [{ name: race.name, href: `/races/${race.slug}` }] : []),
          { name: "大会記事" },
        ]}
      />

      <article>
        <header className="mt-8 sm:mt-12">
          <p className="flex flex-wrap items-center gap-3 text-xs font-bold tracking-wider">
            <span className="h-0.5 w-8 bg-brand" aria-hidden="true" />
            大会記事
            {race && <span className="text-sub">{race.name}</span>}
          </p>
          <h1 className="mt-5 text-pretty text-[25px] font-bold leading-[1.7] tracking-[0.01em] sm:text-[32px] sm:leading-[1.65] sm:tracking-[0.025em]">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="mt-6 text-pretty text-[13px] leading-[1.95] text-sub sm:text-sm">{article.subtitle}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sub">
            <span>取材・編集：{article.author}</span>
            {article.publishedAt && (
              <time dateTime={article.publishedAt.toISOString()}>{formatArticleDate(article.publishedAt)}</time>
            )}
          </div>
        </header>

        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover sm:mt-10"
            fetchPriority="high"
          />
        )}

        <div className="mt-10">
          <div className="min-w-0">
            {headings.length > 1 && (
              <details className="mb-10 rounded-xl border border-line px-5">
                <summary className={`cursor-pointer py-4 text-sm font-bold ${focus}`}>この記事の目次</summary>
                <nav aria-label="記事の目次" className="pb-4">
                  <Contents headings={headings} />
                </nav>
              </details>
            )}

            <ArticleBody blocks={blocks} />

            {race && (
              <section className="mt-16 rounded-xl bg-cream p-6 sm:p-8" aria-label={`${race.name}の情報`}>
                <p className="text-xs font-bold text-sub">{race.timing}開催</p>
                <h2 className="mt-2 text-lg font-bold leading-relaxed">{race.name}のコースを見る</h2>
                <p className="mt-2 text-sm leading-7 text-sub">
                  コースマップと高低差を確認して、目標タイムに合わせたペース表を作れます。
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/races/${race.slug}#course-map`}
                    className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold hover:bg-brand-dark ${focus}`}
                  >
                    <Map size={17} aria-hidden="true" />
                    コースを地図で見る
                  </Link>
                  <Link
                    href={`/races/${race.slug}#pace`}
                    className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-3 text-sm font-bold hover:bg-paper/60 ${focus}`}
                  >
                    <Route size={17} aria-hidden="true" />
                    ペース表を作る
                  </Link>
                </div>
                <a
                  href={race.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-accent underline underline-offset-4 ${focus}`}
                >
                  {race.name} 公式サイト
                  <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                </a>
              </section>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

/** 大会ページに置く、記事への導線 */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="mt-6">
      <Link
        href={`/stories/${article.slug}`}
        className={`group grid overflow-hidden rounded-xl border border-line bg-paper transition-shadow hover:shadow-md sm:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] ${focus}`}
      >
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-40 w-full object-cover sm:h-full sm:min-h-44"
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative flex min-h-32 items-center overflow-hidden bg-cream px-6 py-5 sm:min-h-full sm:p-7"
          >
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-brand/70 sm:-right-24 sm:top-12" />
            <div className="relative border-l-2 border-ink pl-4">
              <p className="text-[10px] font-bold tracking-[0.18em]">どこランの大会記事</p>
              <p className="mt-3 text-xl font-black leading-relaxed sm:text-2xl">
                <span>知って、</span>
                <span className="sm:block">走る。</span>
              </p>
            </div>
          </div>
        )}
        <div className="min-w-0 p-5 sm:p-6 lg:px-8">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold">
            <BookOpen size={15} aria-hidden="true" />
            大会記事
          </p>
          <h2 className="mt-3 text-lg font-bold leading-relaxed tracking-tight group-hover:underline group-hover:underline-offset-4 sm:text-xl">
            {article.title}
          </h2>
          <p className="mt-3 line-clamp-2 text-sm leading-7 text-sub">{article.subtitle ?? article.description}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-xs text-sub">{article.author}</p>
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              記事を読む
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
