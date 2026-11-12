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
      return (
        <p className="mt-5 text-base leading-9">
          <InlineText inline={block.inline} />
        </p>
      );
    case "dialogue": {
      const { label, icon, role } = block.speaker;
      return (
        <div className="mt-6 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center gap-1.5 pt-0.5">
            {icon ? (
              <img
                src={icon}
                alt=""
                loading="lazy"
                // サイトのキャラクター画像は全身なので、顔が入るよう上に寄せる
                className={`size-12 rounded-full bg-cream object-cover ${icon.startsWith("/characters/") ? "object-top" : ""}`}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-full bg-cream text-base font-bold text-sub"
              >
                {label.slice(0, 1)}
              </span>
            )}
            <span className="break-all text-center text-[11px] font-bold leading-4">{label}</span>
          </div>
          {/* 聞き手の発言は色と太字で区別する */}
          <div
            className={`space-y-4 rounded-2xl px-4 py-3 text-base leading-8 ${role === "host" ? "bg-brand/20 font-bold" : "bg-cream"}`}
          >
            {block.paragraphs.map((paragraph, index) => (
              <p key={index}>
                <InlineText inline={paragraph} />
              </p>
            ))}
          </div>
        </div>
      );
    }
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
