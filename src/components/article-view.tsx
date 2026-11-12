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

/** カバー未設定の記事には、選定済みの本文写真を使う。本文やOGP画像は変更しない。 */
const articleCardPhotos: Record<string, { src: string; label: string }> = {
  "mie-matsusaka-marathon": {
    src: "https://pub-c598f7bd37324d98a1771a87633f82d0.r2.dev/articles/e5752087-5758-47c3-81fb-8dd33ba8cad9.jpg",
    label: "運営事務局に聞きました",
  },
};

/** 大会ページに置く、記事への導線 */
export function ArticleCard({ article }: { article: ArticleSummary }) {
  const selectedPhoto = articleCardPhotos[article.slug];
  const imageUrl = article.coverImageUrl || selectedPhoto?.src;
  return (
    <article className="mt-6">
      <Link
        href={`/stories/${article.slug}`}
        className={`group flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 transition-colors hover:border-brand-dark sm:gap-6 sm:p-4 ${focus}`}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-32 sm:w-[220px] lg:w-[280px]"
          />
        )}
        <div className="min-w-0 flex-1 py-1">
          <p className="flex items-center gap-2 text-[10px] leading-5 text-sub sm:text-xs">
            <BookOpen size={15} className="hidden shrink-0 sm:block" aria-hidden="true" />
            {selectedPhoto?.label ?? "大会記事"}
          </p>
          <h2 className="mt-1.5 text-pretty text-sm font-bold leading-[1.7] group-hover:underline group-hover:underline-offset-4 sm:mt-2 sm:text-lg lg:text-xl">
            {article.title}
          </h2>
        </div>
        <ArrowRight
          size={20}
          className="hidden shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transform-none sm:block"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}
