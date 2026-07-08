"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { track } from "@/lib/track";

const buttonClass = "flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-bold hover:bg-cream";

function XLogo({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
}

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    track("share", { channel: "copy" });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("このURLをコピーしてください", url);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="このスポットをシェア">
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => track("share", { channel: "x" })} className={buttonClass}><XLogo />ポスト</a>
      <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => track("share", { channel: "line" })} className={buttonClass}>LINEで送る</a>
      <button type="button" onClick={copy} className={buttonClass}>{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? "コピーしました" : "リンクをコピー"}</button>
    </div>
  );
}
