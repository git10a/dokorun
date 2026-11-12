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
          className="mb-8 mt-14 scroll-mt-24 border-l-4 border-brand pl-[13px] text-xl font-bold leading-[1.75] tracking-[0.03em] sm:mt-[72px] sm:pl-[17px] sm:text-[23px]"
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
        <p className="mt-[22px] text-[15px] leading-[2.05] tracking-[0.025em] sm:text-base">
          <InlineText inline={block.inline} />
        </p>
      );
    case "dialogue": {
      const { label, icon, role } = block.speaker;
      const isHost = role === "host";
      const avatarSize = isHost ? "size-[38px] sm:size-11" : "size-[34px] sm:size-[38px]";
      const speaker = (
        <div
          className={
            isHost
              ? "flex w-10 flex-col items-center gap-1.5 pt-0.5 text-center text-[9px] leading-4 text-sub sm:w-12 sm:text-[10px]"
              : "mb-[15px] flex items-center gap-2.5 text-xs font-bold text-sub"
          }
        >
          {icon ? (
            <img
              src={icon}
              alt=""
              loading="lazy"
              className={`${avatarSize} shrink-0 rounded-full bg-cream object-cover ${icon.startsWith("/characters/") ? "object-top" : ""}`}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`${avatarSize} flex shrink-0 items-center justify-center rounded-full bg-cream text-sm font-bold text-sub`}
            >
              {label.slice(0, 1)}
            </span>
          )}
          <span className="break-words">{label}</span>
        </div>
      );
      const paragraphs = block.paragraphs.map((paragraph, index) => (
        <p key={index}>
          <InlineText inline={paragraph} />
        </p>
      ));
      if (!isHost) {
        return (
          <div className="mb-[38px] mt-6">
            {speaker}
            <div className="space-y-[22px] text-[15px] leading-[2.05] tracking-[0.025em] sm:text-base">
              {paragraphs}
            </div>
          </div>
        );
      }
      return (
        <div className="mb-7 mt-[38px] grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-3.5">
          {speaker}
          <div className="relative rounded-2xl bg-[#fff9d7] px-4 py-3.5 text-sm font-bold leading-[1.95] sm:rounded-[18px] sm:px-5 sm:py-[17px] sm:text-base">
            <span
              aria-hidden="true"
              className="absolute -left-1.5 top-5 size-3.5 rotate-45 rounded-[3px] bg-[#fff9d7]"
            />
            <div className="relative space-y-[22px]">{paragraphs}</div>
          </div>
        </div>
      );
    }
    case "image":
      return (
        <figure className="my-9">
          <img src={block.src} alt={block.caption} loading="lazy" className="w-full rounded-[14px] sm:rounded-2xl" />
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
