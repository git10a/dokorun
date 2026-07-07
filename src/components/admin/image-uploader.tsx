"use client";

import { useState } from "react";

export function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  return <div><input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setLoading(true); setMessage(""); try { const formData = new FormData(); formData.append("file", file); const response = await fetch("/api/upload", { method: "POST", body: formData }); const result = await response.json() as { url?: string; error?: string }; if (!response.ok || !result.url) throw new Error(result.error); onUploaded(result.url); setMessage("画像をアップロードしました"); } catch { setMessage("画像をアップロードできませんでした"); } finally { setLoading(false); } }} className="block w-full rounded-lg border border-line p-2 text-sm" />{message && <p className="mt-2 text-sm">{message}</p>}</div>;
}
