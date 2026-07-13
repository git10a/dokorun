"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const maxEdge = 1600;

async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を処理できませんでした");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("画像を処理できませんでした")), "image/webp", 0.8));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

export function RunPhotoPicker({ initialUrl }: { initialUrl?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [message, setMessage] = useState("");
  const clear = () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPhoto(null); setPreview(""); setMessage("");
    if (input.current) input.current.value = "";
  };
  return <div>
    <p className="font-bold">走った景色を1枚選んでください</p>
    <input type="hidden" name="removePhoto" value={preview ? "false" : "true"} />
    <input ref={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (event) => {
      const selected = event.target.files?.[0];
      if (!selected) return;
      setMessage("");
      try {
        const compressed = await shrinkPhoto(selected);
        const files = new DataTransfer(); files.items.add(compressed);
        if (input.current) input.current.files = files.files;
        if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPhoto(compressed); setPreview(URL.createObjectURL(compressed));
      } catch { clear(); setMessage("JPEG・PNG・WebPの写真を選んでください"); }
    }} />
    {preview ? <div className="mt-3"><img src={preview} alt="選択した写真のプレビュー" className="aspect-video w-full rounded-xl border border-line object-cover" /><div className="mt-3 flex gap-3"><button type="button" onClick={() => input.current?.click()} className="rounded-lg border border-line px-4 py-2 text-sm font-bold">写真を変更</button><button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-lg border border-line px-4 py-2 text-sm font-bold text-danger"><Trash2 size={15} />削除</button></div></div> : <button type="button" onClick={() => input.current?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-bold hover:bg-cream"><ImagePlus size={18} />写真を選ぶ</button>}
    {photo && <p className="sr-only">写真を選択しました</p>}{message && <p role="alert" className="mt-2 text-sm font-bold text-danger">{message}</p>}
  </div>;
}
