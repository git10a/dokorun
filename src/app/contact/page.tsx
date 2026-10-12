import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "リクエスト・お問い合わせ", description: "コースを掲載してほしい大会のリクエスト、コース情報の訂正、ランニングスポットの掲載などを受け付けています。", alternates: { canonical: "/contact" }, openGraph: { url: "/contact" } };
export const dynamic = "force-dynamic";

export default function ContactPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ?? (process.env.NODE_ENV === "production" ? "" : "1x00000000000000000000AA");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="font-bold text-brand-dark">CONTACT</p>
      <h1 className="mt-2 text-3xl font-black sm:text-5xl">リクエスト・お問い合わせ</h1>
      <p className="mt-6 leading-8">出る大会が見つからないときは、大会名を教えてください。大会コースの掲載リクエストや、コース変更・情報の間違いの報告を受け付けています。</p>
      <p className="mt-3 leading-8 text-sub">大会の街で走れるスポットの掲載や、その他のお問い合わせもこちらからどうぞ。</p>
      <div className="mt-10">
        <Suspense fallback={<div className="h-80 rounded-2xl bg-cream" aria-hidden="true" />}>
          <ContactForm turnstileSiteKey={turnstileSiteKey} />
        </Suspense>
      </div>
    </div>
  );
}
