"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAvatar, updateAvatar } from "@/app/me/actions";
import { avatarUrl } from "@/lib/avatars";

const AVATAR_SIZE = 256;

type AvatarUser = { id: string; image: string | null; customAvatarAt: Date | string | null };

async function loadDrawable(file: File): Promise<CanvasImageSource> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("unsupported_image"));
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawableSize(source: CanvasImageSource) {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (source instanceof ImageBitmap) return { width: source.width, height: source.height };
  return { width: 0, height: 0 };
}

async function resizeToAvatar(file: File): Promise<Blob> {
  const source = await loadDrawable(file);
  const { width, height } = drawableSize(source);
  if (!width || !height) throw new Error("unsupported_image");
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unsupported_image");
  ctx.drawImage(source, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!jpeg) throw new Error("unsupported_image");
  return jpeg;
}

export function AvatarUploader({ user }: { user: AvatarUser }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const currentUrl = avatarUrl(user);

  const handleFile = async (file: File) => {
    setMessage("");
    setPending(true);
    try {
      const blob = await resizeToAvatar(file);
      const formData = new FormData();
      formData.set("file", blob, "avatar.webp");
      const result = await updateAvatar(formData);
      setMessage(result.message ?? "");
      if (result.status === "saved") router.refresh();
    } catch {
      setMessage("対応していない画像形式です");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setMessage("");
    setPending(true);
    try {
      const result = await deleteAvatar();
      setMessage(result.message ?? "");
      if (result.status === "saved") router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-line bg-paper p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-cream">
          {currentUrl ? <img src={currentUrl} alt="" width={64} height={64} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <span className="text-xl font-black">走</span>}
        </span>
        <div>
          <h3 className="font-bold">アバター</h3>
          <p className="mt-1 text-sm text-sub">好きな画像をアップロードできます</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }} />
        <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold disabled:opacity-60">{pending ? "処理中…" : "画像を選ぶ"}</button>
        {user.customAvatarAt && <button type="button" disabled={pending} onClick={handleDelete} className="rounded-lg border border-line px-4 py-2 text-sm font-bold hover:bg-cream disabled:opacity-60">削除してGoogleの画像に戻す</button>}
        {message && <p role="status" className="text-sm font-bold text-sub">{message}</p>}
      </div>
    </section>
  );
}
