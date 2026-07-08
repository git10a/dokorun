"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitFeedback, type FeedbackState } from "./actions";
import { track } from "@/lib/track";

const inputClass = "w-full rounded-lg border border-line bg-paper px-3 py-2.5";

export function ContactForm() {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, {});
  const categoryRef = useRef("spot_request");

  useEffect(() => {
    if (state.status === "sent") track("feedback", { category: categoryRef.current });
  }, [state.status]);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl bg-cream px-5 py-12 text-center">
        <p className="text-xl font-bold">送信しました。ありがとうございます!</p>
        <p className="mt-3 text-sub">いただいた内容はすべて運営が読んでいます。掲載リクエストは順次調査して追加していきます。</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6" onSubmit={(event) => { categoryRef.current = String(new FormData(event.currentTarget).get("category") ?? "spot_request"); }}>
      <fieldset>
        <legend className="mb-3 font-bold">内容の種類</legend>
        <div className="flex flex-wrap gap-3">
          {[["spot_request", "スポットの掲載リクエスト"], ["contact", "その他のお問い合わせ"]].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-lg border border-line bg-paper px-4 py-2.5 font-bold has-checked:border-brand has-checked:bg-cream">
              <input type="radio" name="category" value={value} defaultChecked={value === "spot_request"} className="accent-(--color-brand)" />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="feedback-message" className="mb-2 block font-bold">本文 <span className="text-sm font-normal text-sub">(必須・2000文字まで)</span></label>
        <textarea id="feedback-message" name="message" required maxLength={2000} rows={6} placeholder="例: 〇〇県の△△公園を掲載してほしいです。1周約2kmでトイレと駐車場があります。" className={inputClass} />
      </div>
      <div>
        <label htmlFor="feedback-contact" className="mb-2 block font-bold">連絡先 <span className="text-sm font-normal text-sub">(任意・メールアドレスやXアカウントなど)</span></label>
        <input id="feedback-contact" name="contact" maxLength={200} placeholder="you@example.com / @dokorun" className={inputClass} />
        <p className="mt-2 text-sm leading-6 text-sub">内容の確認のため、折り返し連絡をすることがあります。</p>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state.status === "error" && <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm font-bold text-[#B3261E]">{state.message}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-brand px-6 py-3 font-bold disabled:opacity-60">{pending ? "送信中…" : "送信する"}</button>
    </form>
  );
}
