"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { track } from "@/lib/track";

const itemClass = "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-cream focus-visible:bg-cream focus-visible:outline-none";

function XLogo({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
}

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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
    <div className="flex items-center gap-3" aria-label="このスポットをシェア">
      <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
      <div ref={rootRef} className="relative">
        <button ref={triggerRef} type="button" aria-expanded={open} aria-controls="spot-share-menu" onClick={() => setOpen((value) => !value)} className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-bold text-sub transition-colors hover:bg-cream hover:text-ink">
          <Share2 size={15} />このコースを共有
        </button>
        {open && <div id="spot-share-menu" aria-label="共有方法" className="absolute left-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => { track("share", { channel: "x" }); setOpen(false); }} className={`${itemClass} border-b border-line`}><XLogo />Xでポスト</a>
          <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => { track("share", { channel: "line" }); setOpen(false); }} className={`${itemClass} border-b border-line`}><MessageCircle size={16} />LINEで送る</a>
          <button type="button" onClick={copy} className={itemClass}>{copied ? <Check size={16} /> : <Link2 size={16} />}{copied ? "コピーしました" : "リンクをコピー"}</button>
        </div>}
      </div>
    </div>
  );
}
