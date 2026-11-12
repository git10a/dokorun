"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { regeneratePreviewToken } from "@/app/admin/stories/actions";

// 公開前の記事を社外の方に見てもらうためのURL。保存済みの内容が表示される
export function ArticlePreviewLink({ id, url }: { id: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="rounded-xl border border-line bg-cream p-5" aria-label="共有プレビュー">
      <h2 className="text-sm font-bold">共有プレビューのURL</h2>
      <p className="mt-1 text-xs leading-6 text-sub">
        このURLを知っている人は、ログインなしで公開前の記事を読めます。表示されるのは最後に保存した内容です。検索エンジンには登録されません。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="共有プレビューのURL"
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm"
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-paper"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? "コピーしました" : "URLをコピー"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm font-bold"
        >
          <ExternalLink size={16} aria-hidden="true" />
          プレビューを開く
        </a>
      </div>
      <form action={regeneratePreviewToken} className="mt-3">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          onClick={(event) => {
            if (!window.confirm("URLを作り直しますか？これまでに共有したURLは開けなくなります。"))
              event.preventDefault();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sub underline underline-offset-4"
        >
          <RefreshCw size={13} aria-hidden="true" />
          URLを作り直す（共有済みのURLを無効にする）
        </button>
      </form>
    </section>
  );
}
