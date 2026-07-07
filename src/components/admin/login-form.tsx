"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";

const initial: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return <form action={action} className="mt-8 space-y-4"><label className="block text-sm font-bold">パスワード<input type="password" name="password" required autoFocus className="mt-2 h-12 w-full rounded-lg border border-line px-3 outline-none focus:border-ink" /></label>{state.message && <p className="text-sm font-bold text-danger">{state.message}</p>}<button disabled={pending} className="h-12 w-full rounded-lg bg-brand font-bold disabled:opacity-50">{pending ? "確認中…" : "ログイン"}</button></form>;
}
