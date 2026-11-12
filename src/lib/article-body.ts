// 記事本文の軽量記法。1行が1ブロックになる(Googleドキュメントからの貼り付けをそのまま扱える)。
//   ## 見出し / ### 小見出し
//   ![キャプション](画像URL)   … 画像(キャプションは省略可)
//   YouTubeのURLだけの行        … 動画の埋め込み
//   > 引用 / - 箇条書き / ---   … 引用・リスト・区切り線
//   行内: **太字** / [文字](URL) / URLそのまま(自動リンク)
//   「話者：」で始まる行        … 対談の発言(話者ラベルは記事ごとに設定する)
// HTMLは解釈しない。表示側はReact要素として組み立てるので、本文に書かれたタグは文字として表示される

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string };

export type ArticleBlock =
  | { type: "heading"; level: 2 | 3; text: string; id: string }
  | { type: "paragraph"; inline: Inline[]; speaker?: { label: string; role: "host" | "guest" } }
  | { type: "image"; src: string; caption: string }
  | { type: "youtube"; videoId: string; start?: number }
  | { type: "quote"; inline: Inline[] }
  | { type: "list"; items: Inline[][] }
  | { type: "divider" };

/** リンク・画像に使えるURLだけを通す。javascript: などは文字として残す */
export function safeUrl(value: string): string | null {
  const url = value.trim();
  if (/^\/(?!\/)/.test(url)) return url; // サイト内パス
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

/** YouTubeの視聴URL(watch / youtu.be / shorts / live / embed)から動画IDと開始秒を取り出す */
export function parseYoutubeUrl(value: string): { videoId: string; start?: number } | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !youtubeHosts.has(url.hostname)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const candidate =
    url.hostname === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "live", "embed"].includes(segments[0] ?? "")
          ? segments[1]
          : null;
  if (!candidate || !/^[\w-]{11}$/.test(candidate)) return null;
  const startText = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "";
  const start = /^\d+s?$/.test(startText) ? Number.parseInt(startText, 10) : 0;
  return start > 0 ? { videoId: candidate, start } : { videoId: candidate };
}

// **太字** / [文字](URL) / 裸のURL。裸のURLは空白と和文の句読点・括弧で終わる
const inlinePattern = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>「」、。）)]+)/g;

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  const pushText = (value: string) => {
    if (!value) return;
    const last = result.at(-1);
    if (last?.type === "text") last.text += value;
    else result.push({ type: "text", text: value });
  };
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    pushText(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    if (match[1] !== undefined) {
      result.push({ type: "bold", text: match[1] });
      continue;
    }
    const href = safeUrl(match[3] ?? match[4]);
    if (href) result.push({ type: "link", text: match[2] ?? match[4], href });
    else pushText(match[0]);
  }
  pushText(text.slice(cursor));
  return result;
}

/** 話者ラベルの設定値(カンマ・読点区切り)を配列にする。先頭が聞き手 */
export function parseSpeakers(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,、，\n]/)
    .map((label) => label.trim())
    .filter(Boolean);
}

export function parseArticleBody(body: string, speakers?: string | null): ArticleBlock[] {
  const speakerLabels = parseSpeakers(speakers);
  const blocks: ArticleBlock[] = [];
  let headingCount = 0;
  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      headingCount += 1;
      blocks.push({
        type: "heading",
        level: heading[1].length as 2 | 3,
        text: heading[2].trim(),
        id: `section-${headingCount}`,
      });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      blocks.push({ type: "divider" });
      continue;
    }

    const image = /^!\[([^\]]*)\]\((\S+)\)$/.exec(line);
    const imageSrc = image && safeUrl(image[2]);
    if (image && imageSrc) {
      blocks.push({ type: "image", src: imageSrc, caption: image[1].trim() });
      continue;
    }

    const youtube = /^https?:\/\/\S+$/.test(line) ? parseYoutubeUrl(line) : null;
    if (youtube) {
      blocks.push({ type: "youtube", ...youtube });
      continue;
    }

    const quote = /^>\s*(.+)$/.exec(line);
    if (quote) {
      blocks.push({ type: "quote", inline: parseInline(quote[1]) });
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      const last = blocks.at(-1);
      if (last?.type === "list") last.items.push(parseInline(listItem[1]));
      else blocks.push({ type: "list", items: [parseInline(listItem[1])] });
      continue;
    }

    const speakerIndex = speakerLabels.findIndex(
      (label) => line.startsWith(label) && /^[：:]/.test(line.slice(label.length).trimStart()),
    );
    if (speakerIndex >= 0) {
      const label = speakerLabels[speakerIndex];
      const text = line.slice(label.length).trimStart().slice(1).trimStart();
      blocks.push({
        type: "paragraph",
        inline: parseInline(text),
        speaker: { label, role: speakerIndex === 0 ? "host" : "guest" },
      });
      continue;
    }

    blocks.push({ type: "paragraph", inline: parseInline(line) });
  }
  return blocks;
}

/** 目次用。大見出し(##)だけを拾う */
export function articleHeadings(blocks: ArticleBlock[]) {
  return blocks.flatMap((block) => (block.type === "heading" && block.level === 2 ? [block] : []));
}
