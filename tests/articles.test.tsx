import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ArticleBody } from "@/components/article-body";
import {
  articleHeadings,
  parseArticleBody,
  parseSpeakers,
  parseYoutubeUrl,
  serializeSpeakers,
} from "@/lib/article-body";
import { insertLineEdit, pastedImageFiles, toggleBoldEdit, type TextEdit } from "@/lib/article-editing";
import type { Article } from "@/db/articles";

const db = vi.hoisted(() => ({
  getPublishedArticle: vi.fn(),
  getPublishedArticles: vi.fn(),
  getArticleByPreviewToken: vi.fn(),
}));
vi.mock("@/db/articles", () => db);

import StoryPage, { generateMetadata, generateStaticParams } from "@/app/stories/[slug]/page";
import StoryPreview, { metadata as previewMetadata } from "@/app/preview/stories/[slug]/page";

const token = "0123456789abcdef0123456789abcdef";
const article: Article = {
  id: "5b0c1d0e-6f6a-4a52-9d0b-3f1f5a3f2a10",
  slug: "mie-matsusaka-marathon",
  raceSlug: "mie-matsusaka-marathon",
  title: "トンネルに響く「頑張れ」",
  subtitle: "運営事務局に聞く",
  body: "リード文です。\n## 最初の見出し\nどこラン：質問です。\n運営事務局：答えです。",
  speakers: "どこラン、運営事務局",
  author: "どこラン編集部",
  coverImageUrl: "https://img.example/cover.jpg",
  seoTitle: null,
  description: "記事の説明文",
  ogTitle: null,
  ogDescription: null,
  ogImageUrl: null,
  status: "draft",
  publishedAt: null,
  previewToken: token,
  createdAt: new Date("2026-11-12T00:00:00Z"),
  updatedAt: new Date("2026-11-12T00:00:00Z"),
};
const published: Article = { ...article, status: "published", publishedAt: new Date("2026-11-20T00:00:00+09:00") };
const params = (slug: string) => Promise.resolve({ slug });
const html = (body: string, speakers?: string) =>
  renderToStaticMarkup(createElement(ArticleBody, { blocks: parseArticleBody(body, speakers) }));

beforeEach(() => {
  db.getPublishedArticle.mockReset().mockResolvedValue(null);
  db.getPublishedArticles.mockReset().mockResolvedValue([]);
  db.getArticleByPreviewToken.mockReset().mockResolvedValue(null);
});

describe("article body markup", () => {
  it("turns each line into one block and numbers the headings for the table of contents", () => {
    const blocks = parseArticleBody("リード\n\n## 大見出し\n本文\n### 小見出し\n## 次の見出し");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "heading", "paragraph", "heading", "heading"]);
    expect(articleHeadings(blocks).map((heading) => [heading.id, heading.text])).toEqual([
      ["section-1", "大見出し"],
      ["section-3", "次の見出し"],
    ]);
  });

  it("groups each speaker's lines into one bubble, and only for the configured speakers", () => {
    const blocks = parseArticleBody(
      "リード文\nどこラン：質問です。\n運営事務局：答えです。\n名前のない行は続きです。\n詳細はこちら：https://example.com/shop/",
      "どこラン、運営事務局",
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "dialogue", "dialogue"]);
    expect(blocks[1]).toMatchObject({ speaker: { label: "どこラン", role: "host", icon: null } });
    expect(blocks[2]).toMatchObject({ speaker: { label: "運営事務局", role: "guest" } });
    // 「詳細はこちら：」は話者ではないので、直前の話者の続きになる
    expect(blocks[2].type === "dialogue" && blocks[2].paragraphs).toHaveLength(3);
    expect(html("詳細はこちら：https://example.com/shop/")).toContain('href="https://example.com/shop/"');
    // 話者を設定していない記事では、同じ本文がふつうの段落になる
    expect(parseArticleBody("どこラン：質問です。").map((block) => block.type)).toEqual(["paragraph"]);
  });

  it("ends a speaker's turn at a heading, and resumes it in a new bubble after an image", () => {
    const blocks = parseArticleBody(
      "運営事務局：前半です。\n![写真](https://img.example/a.jpg)\n後半です。\n## 次の見出し\n地の文です。",
      "どこラン、運営事務局",
    );
    expect(blocks.map((block) => block.type)).toEqual(["dialogue", "image", "dialogue", "heading", "paragraph"]);
    expect(blocks[2]).toMatchObject({ speaker: { label: "運営事務局" } });
  });

  it("reads speaker icons from the saved settings and shows them beside the bubble", () => {
    const speakers = JSON.stringify([
      { label: "どこラン", icon: "/characters/hashiro-smile.png" },
      { label: "運営事務局", icon: "https://img.example/office.jpg" },
      { label: "悪い人", icon: "javascript:alert(1)" },
    ]);
    expect(parseSpeakers(speakers)).toEqual([
      { label: "どこラン", icon: "/characters/hashiro-smile.png" },
      { label: "運営事務局", icon: "https://img.example/office.jpg" },
      { label: "悪い人", icon: null },
    ]);
    expect(parseSpeakers(serializeSpeakers(parseSpeakers("どこラン、運営事務局")))).toEqual([
      { label: "どこラン", icon: null },
      { label: "運営事務局", icon: null },
    ]);
    const output = html("どこラン：質問です。\n運営事務局：答えです。\n悪い人：こんにちは。", speakers);
    expect(output).toContain('src="/characters/hashiro-smile.png"');
    expect(output).toContain('src="https://img.example/office.jpg"');
    expect(output).not.toContain("javascript:");
    // 聞き手は色だけで区別し、太字にはしない。吹き出しにはアイコン側へ向くしっぽが付く
    expect(output.match(/rounded-2xl[^"]*var\(--color-brand\)/g)).toHaveLength(1);
    expect(output.match(/rounded-2xl[^"]*bg-cream/g)).toHaveLength(2);
    expect(output).not.toMatch(/rounded-2xl[^"]*font-bold/);
    expect(output.match(/rotate-45/g)).toHaveLength(3);
  });

  it("inserts an image or a YouTube video on the line where it is written", () => {
    const blocks = parseArticleBody(
      "前の段落\n![トンネルの演出](https://img.example/tunnel.jpg)\nhttps://youtu.be/dQw4w9WgXcQ?t=90\n後の段落",
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "image", "youtube", "paragraph"]);
    expect(blocks[1]).toMatchObject({ src: "https://img.example/tunnel.jpg", caption: "トンネルの演出" });
    expect(blocks[2]).toMatchObject({ videoId: "dQw4w9WgXcQ", start: 90 });
  });

  it("reads the common YouTube URL forms and rejects look-alikes", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ?si=abc",
    ])
      expect(parseYoutubeUrl(url)?.videoId).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeUrl("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=short")).toBeNull();
  });

  it("embeds YouTube with a referrer, because the site-wide policy sends none", () => {
    const output = html("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(output).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(output).toContain('referrerPolicy="strict-origin-when-cross-origin"');
  });

  it("shows written HTML as text and never links to a script URL", () => {
    const output = html(
      "<script>alert(1)</script>\n[押す](javascript:alert(1))\n![x](javascript:alert(1))\n**太字** と [公式](https://example.com/)",
    );
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<script>");
    expect(output).not.toMatch(/(href|src)="javascript:/);
    expect(output).toContain("<strong>太字</strong>");
    expect(output).toContain('<a href="https://example.com/" target="_blank" rel="noopener noreferrer"');
  });

  it("keeps the Mie Matsusaka manuscript structure: 9 sections, both speakers, one link", () => {
    const source = readFileSync("data/articles/mie-matsusaka-marathon.md", "utf8");
    const [, header, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source)!;
    const speakers = /^speakers: (.+)$/m.exec(header)![1];
    const blocks = parseArticleBody(body, speakers);
    expect(articleHeadings(blocks)).toHaveLength(9);
    const roles = blocks.flatMap((block) => (block.type === "dialogue" ? [block.speaker.role] : []));
    // リード文(見出しの前)は吹き出しにしない
    expect(blocks.slice(0, 3).map((block) => block.type)).toEqual(["paragraph", "paragraph", "paragraph"]);
    expect(roles.filter((role) => role === "host").length).toBeGreaterThan(15);
    expect(roles.filter((role) => role === "guest").length).toBeGreaterThan(15);
    expect(renderToStaticMarkup(createElement(ArticleBody, { blocks }))).toContain(
      'href="https://mie-matsusaka-marathon.jp/omotenashi-shop/"',
    );
  });
});

describe("article editor operations", () => {
  const apply = (body: string, change: TextEdit) => body.slice(0, change.from) + change.text + body.slice(change.to);
  const selection = (body: string, change: TextEdit) => apply(body, change).slice(...change.select);

  it("makes the selection bold with one shortcut and plain again with the next", () => {
    const body = "トンネルは32km地点です。";
    const start = body.indexOf("32km地点");
    const bold = toggleBoldEdit(body, start, start + "32km地点".length);
    expect(apply(body, bold)).toBe("トンネルは**32km地点**です。");
    expect(selection(body, bold)).toBe("32km地点");
    // 太字にした直後の選択のまま、もう一度押すと外れる
    const bolded = apply(body, bold);
    expect(apply(bolded, toggleBoldEdit(bolded, ...bold.select))).toBe(body);
    // 記号ごと選んでも外れる
    expect(apply(bolded, toggleBoldEdit(bolded, start, start + "**32km地点**".length))).toBe(body);
  });

  it("keeps surrounding spaces outside the bold marks and handles each line separately", () => {
    expect(apply("a bold b", toggleBoldEdit("a bold b", 1, 7))).toBe("a **bold** b");
    const lines = "1行目\n\n2行目";
    expect(apply(lines, toggleBoldEdit(lines, 0, lines.length))).toBe("**1行目**\n\n**2行目**");
    const empty = toggleBoldEdit("前後", 1, 1);
    expect(apply("前後", empty)).toBe("前****後");
    expect(empty.select).toEqual([3, 3]);
  });

  it("puts an inserted line after the cursor's line, or into the line when it is blank", () => {
    const body = "1行目\n2行目\n\n4行目";
    expect(apply(body, insertLineEdit(body, 1, "![](x)"))).toBe("1行目\n![](x)\n2行目\n\n4行目");
    expect(apply(body, insertLineEdit(body, 8, "![](x)"))).toBe("1行目\n2行目\n![](x)\n4行目");
    expect(apply(body, insertLineEdit(body, body.length, "![](x)"))).toBe("1行目\n2行目\n\n4行目\n![](x)\n");
    expect(apply("", insertLineEdit("", 0, "![](x)"))).toBe("![](x)\n");
  });

  it("treats a pasted screenshot or copied image as an image, but pasted text as text", () => {
    const png = new File(["x"], "image.png", { type: "image/png" });
    expect(pastedImageFiles({ types: ["Files"], text: "", files: [png] })).toEqual([png]);
    // Finderでコピーした画像にはファイル名が、ブラウザでコピーした画像にはURLが文字として付く
    expect(pastedImageFiles({ types: ["text/plain", "Files"], text: "image.png", files: [png] })).toEqual([png]);
    expect(pastedImageFiles({ types: ["text/html", "Files"], text: "https://x.example/a.png", files: [png] })).toEqual([
      png,
    ]);
    // WordやExcelの文字コピーには見た目の写しの画像が付くが、文字として貼り付ける
    expect(pastedImageFiles({ types: ["text/plain", "text/rtf", "Files"], text: "本文", files: [png] })).toEqual([]);
    expect(pastedImageFiles({ types: ["text/plain", "Files"], text: "文章 と 画像", files: [png] })).toEqual([]);
    expect(pastedImageFiles({ types: ["text/plain"], text: "ただの文字", files: [] })).toEqual([]);
    expect(
      pastedImageFiles({ types: ["Files"], text: "", files: [new File(["x"], "a.pdf", { type: "application/pdf" })] }),
    ).toEqual([]);
  });
});

describe("article publication boundaries", () => {
  it("returns 404 for a slug that is not published", async () => {
    await expect(StoryPage({ params: params("mie-matsusaka-marathon") })).rejects.toThrow();
    await expect(generateMetadata({ params: params("mie-matsusaka-marathon") })).rejects.toThrow();
    expect(await generateStaticParams()).toEqual([]);
  });

  it("renders a published article with its table of contents and race links", async () => {
    db.getPublishedArticle.mockResolvedValue(published);
    const output = renderToStaticMarkup(await StoryPage({ params: params(published.slug) }));
    expect(output).toContain("トンネルに響く「頑張れ」");
    expect(output).toContain('id="section-1"');
    expect(output).toContain("/races/mie-matsusaka-marathon#course-map");
    expect(output).toContain('"@type":"Article"');
    expect(output).not.toContain("記事のプレビュー");
  });

  it("uses the description and cover image for sharing unless OGP fields override them", async () => {
    db.getPublishedArticle.mockResolvedValue(published);
    const base = await generateMetadata({ params: params(published.slug) });
    expect(base.title).toBe(published.title);
    expect(base.description).toBe("記事の説明文");
    expect(base.openGraph).toMatchObject({
      type: "article",
      title: published.title,
      description: "記事の説明文",
      siteName: "どこラン",
      images: [{ url: "https://img.example/cover.jpg" }],
    });
    db.getPublishedArticle.mockResolvedValue({
      ...published,
      seoTitle: "検索用タイトル",
      ogTitle: "SNS用タイトル",
      ogDescription: "SNS用の説明",
      ogImageUrl: "https://img.example/ogp.jpg",
    });
    const custom = await generateMetadata({ params: params(published.slug) });
    expect(custom.title).toBe("検索用タイトル");
    expect(custom.openGraph).toMatchObject({
      title: "SNS用タイトル",
      description: "SNS用の説明",
      images: [{ url: "https://img.example/ogp.jpg" }],
    });
    expect(custom.twitter).toMatchObject({ card: "summary_large_image", images: ["https://img.example/ogp.jpg"] });
  });

  it("falls back to the site-wide image when an article has no image", async () => {
    db.getPublishedArticle.mockResolvedValue({ ...published, coverImageUrl: null });
    const result = await generateMetadata({ params: params(published.slug) });
    expect(result.openGraph).toMatchObject({ images: [{ url: "/og.png" }] });
  });

  it("shows a draft only through its preview token, and keeps the preview out of search", async () => {
    await expect(StoryPreview({ params: params(token) })).rejects.toThrow();
    db.getArticleByPreviewToken.mockImplementation(async (value: string) => (value === token ? article : null));
    const output = renderToStaticMarkup(await StoryPreview({ params: params(token) }));
    expect(output).toContain("公開前の記事です");
    expect(output).toContain("答えです。");
    await expect(StoryPreview({ params: params(article.slug) })).rejects.toThrow();
    expect(previewMetadata.robots).toMatchObject({ index: false, follow: false });
  });
});
