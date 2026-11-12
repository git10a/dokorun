"use client";

import { useState } from "react";

async function resizeImage(file: File, maxSize: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を処理できませんでした");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("画像を処理できませんでした"))),
      "image/jpeg",
      0.85,
    ),
  );
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** 長辺を maxSize(既定2048px)以下のJPEGに縮小してR2へ送り、公開URLを返す */
export async function uploadImage(file: File, folder: "spots" | "articles" = "spots", maxSize = 2048): Promise<string> {
  const formData = new FormData();
  formData.append("file", await resizeImage(file, maxSize));
  formData.append("folder", folder);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const result = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error);
  return result.url;
}

export function ImageUploader({
  onUploaded,
  folder = "spots",
}: {
  onUploaded: (url: string) => void;
  folder?: "spots" | "articles";
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={loading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setLoading(true);
          setMessage("");
          try {
            onUploaded(await uploadImage(file, folder));
            setMessage("画像をアップロードしました");
          } catch {
            setMessage("画像をアップロードできませんでした");
          } finally {
            setLoading(false);
          }
        }}
        className="block w-full rounded-lg border border-line p-2 text-sm"
      />
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
