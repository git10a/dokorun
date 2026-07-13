"use client";

import { useFormStatus } from "react-dom";

export function DeleteRunButton({ label = "削除", className = "text-danger" }: { label?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={(event) => { if (!window.confirm("この記録を削除しますか？")) event.preventDefault(); }} className={`${className} disabled:opacity-50`}>{pending ? "削除中…" : label}</button>;
}
