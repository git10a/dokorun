"use client";

import { useState } from "react";
import { deleteRun } from "@/app/me/logs/actions";

export function DeleteRunForm({ id, returnTo, label = "削除", className = "text-danger", formClassName }: { id: string; returnTo: "spot" | "me"; label?: string; className?: string; formClassName?: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  return <form className={formClassName} onSubmit={async (event) => {
    event.preventDefault();
    if (!window.confirm("この記録を削除しますか？")) return;
    setPending(true);
    setFailed(false);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("returnTo", returnTo);
    try {
      const redirectTo = await deleteRun(formData);
      if (redirectTo) window.location.assign(redirectTo);
      else throw new Error("削除後の移動先がありません");
    } catch {
      setPending(false);
      setFailed(true);
    }
  }}><button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>{pending ? "削除中…" : label}</button>{failed && <p className="mt-2 text-sm font-bold text-danger">削除後の画面移動に失敗しました。再読み込みしてください。</p>}</form>;
}
