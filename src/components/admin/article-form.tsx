"use client";

/* eslint-disable @next/next/no-img-element */
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Heading2, Heading3, ImagePlus, Link2, List, Minus, Quote, SquarePlay } from "lucide-react";
import { saveArticle } from "@/app/admin/stories/actions";
import type { FormState } from "@/app/admin/actions";
import { ArticleBody } from "@/components/article-body";
import { ArticleSpeakersField } from "@/components/admin/article-speakers-field";
import { ImageUploader, uploadImage } from "@/components/admin/image-uploader";
import { parseArticleBody, parseYoutubeUrl, safeUrl } from "@/lib/article-body";

export type ArticleFormValues = {
  title: string;
  subtitle: string;
  slug: string;
  raceSlug: string;
  author: string;
  speakers: string;
  body: string;
  coverImageUrl: string;
  seoTitle: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  publishedOn: string;
};

export const emptyArticleValues: ArticleFormValues = {
  title: "",
  subtitle: "",
  slug: "",
  raceSlug: "",
  author: "どこラン編集部",
  speakers: "",
  body: "",
  coverImageUrl: "",
  seoTitle: "",
  description: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  publishedOn: "",
};

type Panel = "link" | "image" | "youtube" | null;

const fieldClass = "mt-2 h-11 w-full rounded-lg border border-line bg-paper px-3 outline-none focus:border-ink";

function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input {...props} className={fieldClass} />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const initialState: FormState = {};
const toolButton =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-sm font-bold hover:bg-cream";
const textareaClass =
  "mt-2 w-full rounded-lg border border-line bg-paper p-3 font-normal leading-7 outline-none focus:border-ink";

export function ArticleForm({
  id,
  status = "draft",
  initial = emptyArticleValues,
  raceOptions,
  siteHost,
}: {
  id?: string;
  status?: "draft" | "published";
  initial?: ArticleFormValues;
  raceOptions: { slug: string; name: string }[];
  siteHost: string;
}) {
  const [state, action, pending] = useActionState(saveArticle, initialState);
  // フォームのactionは完了時に非制御の入力を初期値へ戻す。入力エラーで長い本文が消えないよう、全項目をstateで持つ
  const [values, setValues] = useState(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [link, setLink] = useState({ text: "", url: "" });
  const [image, setImage] = useState({ url: "", caption: "", message: "", loading: false });
  const [youtube, setYoutube] = useState({ url: "", message: "" });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const caret = useRef({ start: initial.body.length, end: initial.body.length });
  const submitting = useRef(false);

  const error = (name: string) => state.errors?.[name]?.[0];
  const set =
    (key: keyof ArticleFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!submitting.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  const deferredBody = useDeferredValue(values.body);
  const blocks = useMemo(() => parseArticleBody(deferredBody, values.speakers), [deferredBody, values.speakers]);

  // --- 本文の編集操作。カーソル位置は入力欄からフォーカスが外れても使えるよう控えておく ---
  const rememberCaret = () => {
    const element = bodyRef.current;
    if (element) caret.current = { start: element.selectionStart, end: element.selectionEnd };
  };
  const applyBody = (body: string, position: number) => {
    setValues((current) => ({ ...current, body }));
    caret.current = { start: position, end: position };
    setPane("edit");
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(position, position);
    });
  };
  const lineRange = (body: string, position: number) => {
    const start = body.lastIndexOf("\n", position - 1) + 1;
    const end = body.indexOf("\n", position);
    return { start, end: end < 0 ? body.length : end };
  };
  /** カーソルのある行の次に、独立した1行として差し込む(空行にいるときはその行に入れる) */
  const insertLine = (line: string) => {
    const body = values.body;
    const { start, end } = lineRange(body, caret.current.end);
    const blank = body.slice(start, end).trim() === "";
    const head = blank ? body.slice(0, start) : `${body.slice(0, end)}\n`;
    const tail = body.slice(end);
    applyBody(`${head}${line}${tail.startsWith("\n") ? "" : "\n"}${tail}`, head.length + line.length);
  };
  /** カーソルのある行の先頭に記号を付ける。同じ記号が付いていれば外す */
  const toggleLinePrefix = (prefix: string) => {
    const body = values.body;
    const { start, end } = lineRange(body, caret.current.start);
    const line = body.slice(start, end);
    const stripped = line.replace(/^(#{2,3}|>|-)\s+/, "");
    const next = line.startsWith(prefix) ? stripped : `${prefix}${stripped}`;
    applyBody(`${body.slice(0, start)}${next}${body.slice(end)}`, start + next.length);
  };
  const wrapSelection = (before: string, after: string, placeholder: string) => {
    const body = values.body;
    const { start, end } = caret.current;
    const selected = body.slice(start, end) || placeholder;
    applyBody(
      `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`,
      start + before.length + selected.length + after.length,
    );
  };
  const openPanel = (next: Exclude<Panel, null>) => {
    rememberCaret();
    if (next === "link") setLink({ text: values.body.slice(caret.current.start, caret.current.end), url: "" });
    if (next === "image") setImage({ url: "", caption: "", message: "", loading: false });
    if (next === "youtube") setYoutube({ url: "", message: "" });
    setPanel((current) => (current === next ? null : next));
  };

  const insertLink = () => {
    const url = safeUrl(link.url);
    if (!url) return;
    const body = values.body;
    const { start, end } = caret.current;
    const markup = `[${(link.text || url).replace(/[[\]\n]/g, "")}](${url})`;
    applyBody(`${body.slice(0, start)}${markup}${body.slice(end)}`, start + markup.length);
    setPanel(null);
  };
  const insertImage = () => {
    if (!image.url) return;
    insertLine(`![${image.caption.replace(/[[\]\n]/g, "").trim()}](${image.url})`);
    setPanel(null);
  };
  const insertYoutube = () => {
    if (!parseYoutubeUrl(youtube.url)) {
      setYoutube((current) => ({ ...current, message: "YouTubeの動画URLを入力してください" }));
      return;
    }
    insertLine(youtube.url.trim());
    setPanel(null);
  };

  const pageTitle = values.seoTitle || values.title || "記事タイトル";
  const shareTitle = values.ogTitle || pageTitle;
  const shareDescription = values.ogDescription || values.description;
  const shareImage = values.ogImageUrl || values.coverImageUrl || "/og.png";

  return (
    <form
      action={action}
      onSubmit={() => {
        submitting.current = true;
      }}
      className="space-y-12"
    >
      {id && <input type="hidden" name="id" value={id} />}
      {state.message && (
        <div className="rounded-lg bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {state.message}
          {state.errors && (
            <ul className="mt-1 list-disc pl-5 font-normal">
              {Object.values(state.errors)
                .flat()
                .map((text) => (
                  <li key={text}>{text}</li>
                ))}
            </ul>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-5 text-xl font-bold">1. 基本情報</h2>
        <div className="grid gap-5">
          <Field
            label="タイトル"
            name="title"
            required
            value={values.title}
            onChange={set("title")}
            error={error("title")}
          />
          <Field
            label="サブタイトル（任意）"
            name="subtitle"
            value={values.subtitle}
            onChange={set("subtitle")}
            error={error("subtitle")}
          />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold">
            関連する大会
            <select
              name="raceSlug"
              value={values.raceSlug}
              onChange={(event) => {
                const raceSlug = event.target.value;
                // 新規作成でURLが空なら、大会のslugを初期値として入れる
                setValues((current) => ({ ...current, raceSlug, slug: current.slug || raceSlug }));
              }}
              className={fieldClass}
            >
              <option value="">大会に紐付けない</option>
              {raceOptions.map((race) => (
                <option key={race.slug} value={race.slug}>
                  {race.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-sub">
              選んだ大会のページに、この記事へのリンクが表示されます。
            </span>
            {error("raceSlug") && <span className="mt-1 block text-xs text-danger">{error("raceSlug")}</span>}
          </label>
          <label className="text-sm font-bold">
            記事のURL
            <span className="mt-2 flex items-center gap-1 font-normal">
              <span className="shrink-0 text-xs text-sub">{siteHost}/stories/</span>
              <input
                name="slug"
                required
                value={values.slug}
                onChange={set("slug")}
                placeholder="mie-matsusaka-marathon"
                className={fieldClass.replace("mt-2 ", "")}
              />
            </span>
            {error("slug") && <span className="mt-1 block text-xs text-danger">{error("slug")}</span>}
          </label>
          <Field
            label="執筆者"
            name="author"
            required
            value={values.author}
            onChange={set("author")}
            error={error("author")}
          />
        </div>
        <div className="mt-5">
          <input type="hidden" name="speakers" value={values.speakers} />
          <ArticleSpeakersField
            value={values.speakers}
            onChange={(speakers) => setValues((current) => ({ ...current, speakers }))}
          />
          {error("speakers") && <span className="mt-1 block text-xs text-danger">{error("speakers")}</span>}
        </div>
        <div className="mt-5">
          <p className="text-sm font-bold">カバー画像（任意）</p>
          <p className="mt-1 text-xs text-sub">
            記事の冒頭と大会ページのカードに表示します。横長（16:9）がおすすめです。
          </p>
          <input type="hidden" name="coverImageUrl" value={values.coverImageUrl} />
          <div className="mt-2 flex flex-wrap items-start gap-4">
            {values.coverImageUrl && (
              <img
                src={values.coverImageUrl}
                alt="カバー画像"
                className="aspect-[16/9] w-56 shrink-0 rounded-lg border border-line object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <ImageUploader
                folder="articles"
                onUploaded={(url) => setValues((current) => ({ ...current, coverImageUrl: url }))}
              />
              {values.coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setValues((current) => ({ ...current, coverImageUrl: "" }))}
                  className="mt-2 text-xs font-bold text-danger underline"
                >
                  カバー画像を外す
                </button>
              )}
              {error("coverImageUrl") && (
                <span className="mt-1 block text-xs text-danger">{error("coverImageUrl")}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">2. 本文</h2>
          <p className="text-xs text-sub">{values.body.length.toLocaleString()}文字</p>
        </div>
        <p className="mb-4 text-sm leading-7 text-sub">
          1行が1段落になります。画像や動画は、入れたい行にカーソルを置いてからボタンを押すと、その次の行に入ります。
        </p>

        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="本文の編集">
          <button type="button" className={toolButton} onClick={() => (rememberCaret(), toggleLinePrefix("## "))}>
            <Heading2 size={16} aria-hidden="true" />
            見出し
          </button>
          <button type="button" className={toolButton} onClick={() => (rememberCaret(), toggleLinePrefix("### "))}>
            <Heading3 size={16} aria-hidden="true" />
            小見出し
          </button>
          <button
            type="button"
            className={toolButton}
            onClick={() => (rememberCaret(), wrapSelection("**", "**", "太字"))}
          >
            <Bold size={16} aria-hidden="true" />
            太字
          </button>
          <button type="button" className={toolButton} onClick={() => (rememberCaret(), toggleLinePrefix("> "))}>
            <Quote size={16} aria-hidden="true" />
            引用
          </button>
          <button type="button" className={toolButton} onClick={() => (rememberCaret(), toggleLinePrefix("- "))}>
            <List size={16} aria-hidden="true" />
            箇条書き
          </button>
          <button type="button" className={toolButton} onClick={() => (rememberCaret(), insertLine("---"))}>
            <Minus size={16} aria-hidden="true" />
            区切り線
          </button>
          <button
            type="button"
            className={toolButton}
            aria-expanded={panel === "link"}
            onClick={() => openPanel("link")}
          >
            <Link2 size={16} aria-hidden="true" />
            リンク
          </button>
          <button
            type="button"
            className={`${toolButton} border-ink`}
            aria-expanded={panel === "image"}
            onClick={() => openPanel("image")}
          >
            <ImagePlus size={16} aria-hidden="true" />
            画像を入れる
          </button>
          <button
            type="button"
            className={`${toolButton} border-ink`}
            aria-expanded={panel === "youtube"}
            onClick={() => openPanel("youtube")}
          >
            <SquarePlay size={16} aria-hidden="true" />
            YouTubeを入れる
          </button>
        </div>

        {panel === "link" && (
          <div className="mt-3 grid gap-3 rounded-lg border border-line bg-cream p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-bold">
              表示する文字
              <input
                value={link.text}
                onChange={(event) => setLink((current) => ({ ...current, text: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-bold">
              リンク先のURL
              <input
                value={link.url}
                onChange={(event) => setLink((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://"
                className={fieldClass}
              />
            </label>
            <button
              type="button"
              onClick={insertLink}
              disabled={!safeUrl(link.url)}
              className="h-11 rounded-lg bg-ink px-5 text-sm font-bold text-paper disabled:opacity-40"
            >
              リンクを入れる
            </button>
          </div>
        )}
        {panel === "image" && (
          <div className="mt-3 rounded-lg border border-line bg-cream p-4">
            <div className="flex flex-wrap items-start gap-4">
              {image.url && (
                <img src={image.url} alt="" className="w-40 shrink-0 rounded-lg border border-line object-cover" />
              )}
              <div className="min-w-0 flex-1 space-y-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="本文に入れる画像"
                  disabled={image.loading}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setImage((current) => ({ ...current, loading: true, message: "アップロード中…" }));
                    try {
                      const url = await uploadImage(file, "articles");
                      setImage((current) => ({ ...current, url, loading: false, message: "" }));
                    } catch {
                      setImage((current) => ({
                        ...current,
                        loading: false,
                        message: "画像をアップロードできませんでした",
                      }));
                    }
                  }}
                  className="block w-full rounded-lg border border-line bg-paper p-2 text-sm"
                />
                {image.message && <p className="text-sm">{image.message}</p>}
                <label className="block text-sm font-bold">
                  キャプション（任意）
                  <input
                    value={image.caption}
                    onChange={(event) => setImage((current) => ({ ...current, caption: event.target.value }))}
                    placeholder="写真の説明や提供元"
                    className={fieldClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={insertImage}
                  disabled={!image.url}
                  className="h-11 rounded-lg bg-ink px-5 text-sm font-bold text-paper disabled:opacity-40"
                >
                  カーソルの行に画像を入れる
                </button>
              </div>
            </div>
          </div>
        )}
        {panel === "youtube" && (
          <div className="mt-3 grid gap-3 rounded-lg border border-line bg-cream p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-sm font-bold">
              YouTubeのURL
              <input
                value={youtube.url}
                onChange={(event) => setYoutube({ url: event.target.value, message: "" })}
                placeholder="https://www.youtube.com/watch?v=..."
                className={fieldClass}
              />
              {youtube.message && <span className="mt-1 block text-xs text-danger">{youtube.message}</span>}
            </label>
            <button
              type="button"
              onClick={insertYoutube}
              disabled={!youtube.url.trim()}
              className="h-11 rounded-lg bg-ink px-5 text-sm font-bold text-paper disabled:opacity-40"
            >
              カーソルの行に動画を入れる
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-2 lg:hidden" role="tablist" aria-label="本文の表示切り替え">
          {(["edit", "preview"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={pane === name}
              onClick={() => setPane(name)}
              className={`h-10 flex-1 rounded-lg border text-sm font-bold ${pane === name ? "border-ink bg-ink text-paper" : "border-line"}`}
            >
              {name === "edit" ? "編集" : "プレビュー"}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <div className={pane === "edit" ? "" : "hidden lg:block"}>
            <textarea
              ref={bodyRef}
              name="body"
              required
              aria-label="本文"
              value={values.body}
              onChange={set("body")}
              onSelect={rememberCaret}
              onBlur={rememberCaret}
              spellCheck={false}
              className="h-[70vh] min-h-96 w-full resize-y rounded-lg border border-line bg-paper p-4 text-sm leading-7 outline-none focus:border-ink"
            />
            {error("body") && <span className="mt-1 block text-xs text-danger">{error("body")}</span>}
            <details className="mt-2 text-xs leading-6 text-sub">
              <summary className="cursor-pointer font-bold">書き方の一覧</summary>
              <ul className="mt-2 space-y-1">
                <li>
                  <code>## 見出し</code> ／ <code>### 小見出し</code>
                </li>
                <li>
                  <code>![キャプション](画像のURL)</code> … 画像
                </li>
                <li>YouTubeのURLだけを1行に書く … 動画の埋め込み（URLの t=90 で再生開始位置を指定）</li>
                <li>
                  <code>**太字**</code> ／ <code>[文字](URL)</code> ／ URLはそのまま書いてもリンクになります
                </li>
                <li>
                  <code>&gt; 引用</code> ／ <code>- 箇条書き</code> ／ <code>---</code> 区切り線
                </li>
              </ul>
            </details>
          </div>
          <div
            aria-label="本文のプレビュー"
            className={`h-[70vh] min-h-96 overflow-y-auto rounded-lg border border-line p-5 ${pane === "preview" ? "" : "hidden lg:block"}`}
          >
            {blocks.length ? (
              <ArticleBody blocks={blocks} />
            ) : (
              <p className="text-sm text-sub">本文を入力すると、ここに表示されます。</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">3. 検索結果とSNSでの見え方</h2>
        <p className="mb-5 text-sm leading-7 text-sub">
          空欄の項目は、タイトルや説明文、カバー画像をそのまま使います。
        </p>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid content-start gap-5">
            <Field
              label="検索結果のタイトル（任意）"
              name="seoTitle"
              value={values.seoTitle}
              onChange={set("seoTitle")}
              placeholder={values.title}
            />
            <label className="block text-sm font-bold">
              説明文（description）
              <textarea
                name="description"
                required
                rows={4}
                value={values.description}
                onChange={set("description")}
                className={textareaClass}
              />
              <span className="mt-1 flex justify-between text-xs font-normal text-sub">
                <span>検索結果とSNSに出る紹介文です。80〜120文字が目安です。</span>
                <span className={values.description.length > 120 ? "text-danger" : ""}>
                  {values.description.length}文字
                </span>
              </span>
              {error("description") && <span className="mt-1 block text-xs text-danger">{error("description")}</span>}
            </label>
            <Field
              label="SNSで表示するタイトル（任意）"
              name="ogTitle"
              value={values.ogTitle}
              onChange={set("ogTitle")}
              placeholder={pageTitle}
            />
            <label className="block text-sm font-bold">
              SNSで表示する説明文（任意）
              <textarea
                name="ogDescription"
                rows={3}
                value={values.ogDescription}
                onChange={set("ogDescription")}
                placeholder={values.description}
                className={textareaClass}
              />
            </label>
            <div>
              <p className="text-sm font-bold">SNSで表示する画像（OGP画像・任意）</p>
              <p className="mt-1 text-xs text-sub">
                1200×630pxがおすすめです。未設定のときはカバー画像、それも無ければサイト共通の画像になります。
              </p>
              <input type="hidden" name="ogImageUrl" value={values.ogImageUrl} />
              <div className="mt-2">
                <ImageUploader
                  folder="articles"
                  onUploaded={(url) => setValues((current) => ({ ...current, ogImageUrl: url }))}
                />
                {values.ogImageUrl && (
                  <button
                    type="button"
                    onClick={() => setValues((current) => ({ ...current, ogImageUrl: "" }))}
                    className="mt-2 text-xs font-bold text-danger underline"
                  >
                    OGP画像を外す
                  </button>
                )}
                {error("ogImageUrl") && <span className="mt-1 block text-xs text-danger">{error("ogImageUrl")}</span>}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-sub">検索結果での見え方（目安）</p>
              <div className="mt-2 rounded-lg border border-line p-4">
                <p className="truncate text-xs text-sub">
                  {siteHost}/stories/{values.slug || "…"}
                </p>
                <p className="mt-1 line-clamp-2 text-lg leading-snug text-accent">{pageTitle} | どこラン</p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-sub">
                  {values.description || "説明文を入力してください"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-sub">SNSで共有したときの見え方（目安）</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-line">
                <img src={shareImage} alt="" className="aspect-[1200/630] w-full bg-cream object-cover" />
                <div className="p-4">
                  <p className="text-xs text-sub">{siteHost}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-6">{shareTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-sub">{shareDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-end justify-between gap-4 border-t border-line bg-paper px-4 py-4">
        <label className="text-sm font-bold">
          公開日（任意）
          <input
            type="date"
            name="publishedOn"
            value={values.publishedOn}
            onChange={set("publishedOn")}
            className={`${fieldClass} w-44`}
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* 保存ボタンは画面下に固定しているので、エラーもここに出す(詳細はフォームの先頭) */}
          {state.message ? (
            <p role="alert" className="max-w-xs text-xs font-bold leading-5 text-danger">
              {state.message}
              {state.errors && `：${Object.values(state.errors).flat()[0]}`}
            </p>
          ) : (
            <p className="text-xs text-sub">
              {status === "published" ? "公開中" : "下書き"}
              {dirty && "・未保存の変更があります"}
            </p>
          )}
          <button
            name="status"
            value="draft"
            disabled={pending}
            onClick={(event) => {
              if (status === "published" && !window.confirm("公開を取り下げて下書きに戻しますか？"))
                event.preventDefault();
            }}
            className="rounded-lg border border-line px-5 py-3 text-sm font-bold hover:bg-cream disabled:opacity-50"
          >
            {status === "published" ? "下書きに戻す" : "下書きを保存"}
          </button>
          <button
            name="status"
            value="published"
            disabled={pending}
            onClick={(event) => {
              if (status !== "published" && !window.confirm("この記事を公開しますか？誰でも読める状態になります。"))
                event.preventDefault();
            }}
            className="min-w-40 rounded-lg bg-brand px-7 py-3 font-bold hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "保存中…" : status === "published" ? "公開中の記事を更新" : "公開する"}
          </button>
        </div>
      </div>
    </form>
  );
}
