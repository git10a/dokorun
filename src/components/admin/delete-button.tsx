"use client";

import { useFormStatus } from "react-dom";

export function DeleteButton({ confirmMessage = "このスポットを削除しますか？" }: { confirmMessage?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={(event) => { if (!window.confirm(confirmMessage)) event.preventDefault(); }} className="text-sm font-bold text-danger disabled:opacity-50">{pending ? "削除中…" : "削除"}</button>;
}
