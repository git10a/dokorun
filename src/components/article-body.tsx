/* eslint-disable @next/next/no-img-element */
import type { ArticleBlock, Inline } from "@/lib/article-body";

// 記事本文の表示。公開ページ(サーバー)と管理画面のライブプレビュー(クライアント)の両方で使うため、
// サーバー専用・クライアント専用のAPIは使わない

function InlineText({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((part, index) => {
        if (part.type === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.type === "link") {
          const external = /^https?:\/\//.test(part.href);
          return (
            <a
              key={index}
              href={part.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="break-all text-accent underline underline-offset-4"
            >
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? (
        <h2
          id={block.id}
          className="mt-14 scroll-mt-24 border-l-4 border-brand pl-4 text-xl font-bold leading-relaxed sm:mt-20 sm:text-2xl"
        >
          {block.text}
        </h2>
      ) : (
        <h3 id={block.id} className="mt-10 scroll-mt-24 text-lg font-bold leading-relaxed">
          {block.text}
        </h3>
      );
    case "paragraph":
      if (!block.speaker) {
        return (
          <p className="mt-5 text-base leading-9">
            <InlineText inline={block.inline} />
          </p>
        );
      }
      // 聞き手の発言は太字にして、やり取りの切れ目が分かるように上を広めに空ける
      return (
        <p className={`text-base leading-9 ${block.speaker.role === "host" ? "mt-9 font-bold" : "mt-5"}`}>
          <span className="font-bold">{block.speaker.label}：</span>
          <InlineText inline={block.inline} />
        </p>
      );
    case "image":
      return (
        <figure className="my-9">
          <img src={block.src} alt={block.caption} loading="lazy" className="w-full rounded-xl" />
          {block.caption && <figcaption className="mt-2 text-xs leading-6 text-sub">{block.caption}</figcaption>}
        </figure>
      );
    case "youtube":
      return (
        <div className="my-9 aspect-video overflow-hidden rounded-xl bg-cream">
          {/* サイト全体は Referrer-Policy: no-referrer。YouTubeの埋め込みはリファラーが無いと再生できないため、ここだけ送る */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.videoId}${block.start ? `?start=${block.start}` : ""}`}
            title="YouTube動画"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      );
    case "quote":
      return (
        <blockquote className="my-8 border-l-2 border-brand bg-cream px-6 py-5 text-lg font-medium leading-9">
          <InlineText inline={block.inline} />
        </blockquote>
      );
    case "list":
      return (
        <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-8">
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineText inline={item} />
            </li>
          ))}
        </ul>
      );
    case "divider":
      return <hr className="my-10 border-line" />;
  }
}

export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
