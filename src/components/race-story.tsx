import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, ChevronRight, ExternalLink, Map, Route } from "lucide-react";
import type { RaceStory } from "@/lib/race-stories";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

function Contents({ story }: { story: RaceStory }) {
  return <ol className="space-y-1">
    {story.sections.map((section, index) => <li key={section.id}>
      <a href={`#${section.id}`} className={`flex min-h-11 items-start gap-3 py-3 text-sm leading-6 transition-colors hover:text-accent ${focus}`}>
        <span className="font-bold tabular-nums text-sub">{String(index + 1).padStart(2, "0")}</span>{section.title}
      </a>
    </li>)}
    <li className="mt-3 border-t border-line pt-3"><a href="#strategy" className={`flex min-h-11 items-center justify-between gap-2 py-3 text-sm font-bold ${focus}`}>攻略編について <ArrowDown size={16} aria-hidden="true" /></a></li>
  </ol>;
}

export function RaceStoryArticle({ story, preview = false }: { story: RaceStory; preview?: boolean }) {
  return <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6 md:pt-10">
    {preview && <div role="note" className="mb-6 rounded-lg border border-brand bg-brand/10 px-4 py-3 text-xs leading-6 sm:text-sm">
      <strong>{story.isSample ? "記事デザインのサンプル" : "記事のプレビュー"}</strong>
      <span className="ml-2">{story.isSample ? "取材前の編集サンプルです。運営者の発言・監修は含みません。" : "未公開の記事を確認しています。"}</span>
    </div>}

    <nav aria-label="パンくず" className="mb-8 flex flex-wrap items-center gap-2 text-xs leading-6 text-sub">
      <Link href="/races" className={`hover:text-ink ${focus}`}>大会をさがす</Link><ChevronRight size={12} aria-hidden="true" />
      <Link href={`/races/${story.raceSlug}`} className={`hover:text-ink ${focus}`}>{story.raceName}</Link><ChevronRight size={12} aria-hidden="true" />
      <span aria-current="page">大会を知る読み物</span>
    </nav>

    <article>
      <header className="max-w-4xl">
        <p className="flex flex-wrap items-center gap-3 text-xs font-bold tracking-wider"><span className="h-0.5 w-8 bg-brand" aria-hidden="true" />大会を知る読み物<span className="text-sub">{story.year} / {story.raceName}</span></p>
        <h1 className="mt-5 text-[26px] font-black leading-[1.5] tracking-tight min-[375px]:text-[30px] sm:text-[44px] lg:text-[48px]">{story.title.split("\n").map((line) => <span key={line} className="block text-balance">{line}</span>)}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sub">
          <span>{story.isSample ? "構成・編集" : "取材・編集"}：{story.author}</span>
          {story.publishedAt && <time dateTime={story.publishedAt}>{story.publishedAt.replaceAll("-", ".")}</time>}
          {story.isSample && <span>取材前サンプル</span>}
        </div>
      </header>

      <div className="relative mt-8 overflow-hidden rounded-xl bg-cream px-6 py-9 sm:mt-10 sm:px-10 sm:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full border-[36px] border-brand/65 sm:right-12 sm:size-80" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-24 size-72 rounded-full border border-ink/15" />
        <div className="relative max-w-lg">
          <p className="text-xs font-bold tracking-[0.18em]">{story.raceName} {story.year}</p>
          <p className="mt-5 text-balance text-2xl font-black leading-relaxed sm:text-4xl">知って走る。<br />自分の力を、<br className="sm:hidden" />ゴールまで。</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold sm:text-sm">
            {["大会の思い", "コースの特徴", "自分の作戦"].map((label, i) => <span key={label}><span className="mr-2 text-sub">0{i + 1}</span>{label}</span>)}
          </div>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-12 lg:mt-14 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
          <p className="text-base font-medium leading-9 sm:text-lg sm:leading-9">{story.intro}</p>
          {story.interviewee && <div className="mt-8 border-y border-line py-5"><p className="text-xs text-sub">お話を伺った人</p><p className="mt-2 font-bold">{story.interviewee.name}<span className="ml-3 text-sm font-normal text-sub">{story.interviewee.role}</span></p></div>}

          <details className="mt-8 rounded-xl border border-line px-5 lg:hidden">
            <summary className={`cursor-pointer py-4 text-sm font-bold ${focus}`}>この記事の目次</summary>
            <nav aria-label="記事の目次（モバイル）" className="pb-4"><Contents story={story} /></nav>
          </details>

          {story.sections.map((section, i) => <section key={section.id} id={section.id} className="mt-14 scroll-mt-24 sm:mt-20">
            <p className="text-xs font-bold tabular-nums text-sub">CHAPTER {String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 border-l-4 border-brand pl-4 text-xl font-bold leading-relaxed sm:text-2xl">{section.title}</h2>
            <div className="mt-6 space-y-5 text-base leading-9">{section.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
            {section.quote && <figure className="my-8 border-l-2 border-brand bg-cream px-6 py-5"><blockquote className="text-lg font-medium leading-9">{section.quote.text}</blockquote><figcaption className="mt-4 text-xs text-sub">— {section.quote.speaker}</figcaption></figure>}
            {section.question && <div className="mt-7 border-t border-line pt-5"><p className="text-xs font-bold text-sub">{story.isSample ? "取材で聞きたいこと" : "この章の問い"}</p><p className="mt-2 text-sm font-bold leading-7">{section.question}</p></div>}
          </section>)}

          <section className="mt-12 border-y border-line py-6" aria-label="出典">
            <p className="text-xs font-bold text-sub">{story.isSample ? "サンプル内のコース紹介の出典" : "出典・参考情報"}</p>
            {story.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer" className={`mt-3 flex min-h-11 items-center gap-2 text-sm text-accent underline underline-offset-4 ${focus}`}>{source.label}<ExternalLink size={14} className="shrink-0" aria-hidden="true" /></a>)}
          </section>

          <section id="strategy" className="mt-16 scroll-mt-24 sm:mt-20">
            <div>
              <p className="text-xs font-bold text-sub">レースの準備</p>
              <h2 className="mt-3 whitespace-pre-line border-l-4 border-brand pl-4 text-xl font-bold leading-relaxed sm:text-2xl">{story.guide.title}</h2>
              <p className="mt-6 text-base leading-9">{story.guide.description}</p>
            </div>
            <div className="mt-7">
              <ol className="divide-y divide-line">{story.guide.chapters.map((chapter, i) => <li key={chapter.title} className="flex gap-4 py-5 first:pt-0">
                <span className="pt-0.5 text-sm font-black tabular-nums">0{i + 1}</span>
                <div><h3 className="font-bold">{chapter.title}</h3><p className="mt-2 text-sm leading-7 text-sub">{chapter.description}</p></div>
              </li>)}</ol>
            </div>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={`/races/${story.raceSlug}#course-map`} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold hover:bg-brand-dark ${focus}`}><Map size={17} aria-hidden="true" />コースを地図で見る</Link>
            <Link href={`/races/${story.raceSlug}#pace`} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-bold hover:bg-cream ${focus}`}><Route size={17} aria-hidden="true" />ペース表を作る</Link>
          </div>
        </div>

        <aside className="sticky top-24 hidden lg:block">
          <p className="text-xs font-bold tracking-wider text-sub">CONTENTS</p>
          <nav aria-label="記事の目次" className="mt-4"><Contents story={story} /></nav>
          <div className="mt-7 border-t border-line pt-6">
            <p className="text-xs font-bold text-sub">本番の準備を進める</p>
            <Link href={`/races/${story.raceSlug}#course-map`} className={`mt-3 flex min-h-12 items-center justify-between gap-2 text-sm font-bold hover:text-accent ${focus}`}>コースマップ <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href={`/races/${story.raceSlug}#pace`} className={`flex min-h-12 items-center justify-between gap-2 text-sm font-bold hover:text-accent ${focus}`}>ペース表 <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
    </article>
  </div>;
}

export function RaceStoryCard({ story, preview = false }: { story: RaceStory; preview?: boolean }) {
  return <article className="mt-6">
    <Link href={`${preview ? "/preview" : ""}/stories/${story.slug}`} className={`group grid overflow-hidden rounded-xl border border-line bg-paper transition-shadow hover:shadow-md sm:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] ${focus}`}>
      <div aria-hidden="true" className="relative flex min-h-32 items-center overflow-hidden bg-cream px-6 py-5 sm:min-h-full sm:p-7">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-brand/70 sm:-right-24 sm:top-12" />
        <div className="relative border-l-2 border-ink pl-4">
          <p className="text-[10px] font-bold tracking-[0.18em]">どこランの大会記事</p>
          <p className="mt-3 text-xl font-black leading-relaxed sm:text-2xl"><span>知って、</span><span className="sm:block">走る。</span></p>
          <p className="mt-3 text-xs font-bold">{story.raceName} <span className="ml-1 font-normal">{story.year}</span></p>
        </div>
      </div>
      <div className="min-w-0 p-5 sm:p-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold"><BookOpen size={15} aria-hidden="true" />大会記事</span>
          {preview && <span className="rounded bg-cream px-2 py-1 text-sub">取材前サンプル</span>}
        </div>
        <h2 className="mt-3 whitespace-pre-line text-lg font-bold leading-relaxed tracking-tight group-hover:underline group-hover:underline-offset-4 sm:text-xl">{story.title}</h2>
        <p className="mt-3 line-clamp-2 text-sm leading-7 text-sub">{story.intro}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-sub">{story.author}</p>
          <span className="inline-flex items-center gap-2 text-sm font-bold">記事を読む<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  </article>;
}
