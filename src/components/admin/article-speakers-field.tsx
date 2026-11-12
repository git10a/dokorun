"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { uploadImage } from "@/components/admin/image-uploader";
import { parseSpeakers, serializeSpeakers, type ArticleSpeaker } from "@/lib/article-body";

// どこラン側の話者にそのまま使える、サイトのキャラクター
const presetIcons = [
  { name: "ハシロー", src: "/characters/hashiro-smile.png" },
  { name: "ラン", src: "/characters/ran-smile.png" },
];

const inputClass = "h-11 w-full rounded-lg border border-line bg-paper px-3 outline-none focus:border-ink";

/**
 * 対談の話者(名前とアイコン)を設定する欄。
 * 値はJSON文字列で持ち、名前が空の行は保存対象から外す
 */
export function ArticleSpeakersField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [rows, setRows] = useState<ArticleSpeaker[]>(() => parseSpeakers(value));
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const update = (next: ArticleSpeaker[]) => {
    setRows(next);
    const named = next.filter((row) => row.label.trim());
    onChange(named.length ? serializeSpeakers(named) : "");
  };
  const patch = (index: number, change: Partial<ArticleSpeaker>) =>
    update(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <div>
      <p className="text-sm font-bold">対談の話者（任意）</p>
      <p className="mt-1 text-xs leading-6 text-sub">
        本文で「どこラン：」のように名前で始まる行が、その人の吹き出しになります。名前のない行は、直前の人の発言の続きとして同じ吹き出しに入ります。1人目が聞き手です。
      </p>
      <ul className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
            {row.icon ? (
              <img
                src={row.icon}
                alt=""
                className={`size-12 shrink-0 rounded-full bg-cream object-cover ${row.icon.startsWith("/characters/") ? "object-top" : ""}`}
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cream text-base font-bold text-sub">
                {row.label.trim().slice(0, 1) || "?"}
              </span>
            )}
            <label className="min-w-40 flex-1 text-xs font-bold text-sub">
              {index === 0 ? "聞き手の名前" : "話し手の名前"}
              <input
                value={row.label}
                maxLength={20}
                onChange={(event) => patch(index, { label: event.target.value })}
                placeholder={index === 0 ? "どこラン" : "運営事務局"}
                aria-label={`話者${index + 1}の名前`}
                className={`mt-1 text-base font-normal text-ink ${inputClass}`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-line bg-paper px-3 text-sm font-bold hover:bg-cream">
                {busy === index ? "アップロード中…" : "アイコン画像を選ぶ"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={`話者${index + 1}のアイコン画像`}
                  disabled={busy !== null}
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setBusy(index);
                    setMessage("");
                    try {
                      // 表示は48pxなので、小さく縮めて送る
                      patch(index, { icon: await uploadImage(file, "articles", 256) });
                    } catch {
                      setMessage("アイコンをアップロードできませんでした");
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              </label>
              {presetIcons.map((preset) => (
                <button
                  key={preset.src}
                  type="button"
                  title={`${preset.name}のアイコンを使う`}
                  aria-label={`話者${index + 1}に${preset.name}のアイコンを使う`}
                  onClick={() => patch(index, { icon: preset.src })}
                  className={`size-10 overflow-hidden rounded-full border bg-cream ${row.icon === preset.src ? "border-ink" : "border-line"}`}
                >
                  <img src={preset.src} alt="" className="size-full object-cover object-top" />
                </button>
              ))}
              {row.icon && (
                <button
                  type="button"
                  onClick={() => patch(index, { icon: null })}
                  className="text-xs font-bold text-sub underline underline-offset-4"
                >
                  アイコンを外す
                </button>
              )}
              <button
                type="button"
                aria-label={`話者${index + 1}を削除`}
                onClick={() => update(rows.filter((_, i) => i !== index))}
                className="inline-flex size-10 items-center justify-center rounded-lg text-danger hover:bg-danger-soft"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {message && <p className="mt-2 text-sm text-danger">{message}</p>}
      {rows.length < 6 && (
        <button
          type="button"
          onClick={() => update([...rows, { label: "", icon: null }])}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold hover:bg-cream"
        >
          <Plus size={16} aria-hidden="true" />
          話者を追加
        </button>
      )}
    </div>
  );
}
