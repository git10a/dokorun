import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "リクエスト・お問い合わせ", description: "掲載してほしいランニングスポットのリクエストや、どこランへのお問い合わせを受け付けています。" };

type SearchParams = Promise<{ category?: string; message?: string }>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialCategory = params.category === "contact" ? "contact" : "spot_request";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="font-bold text-brand-dark">CONTACT</p>
      <h1 className="mt-2 text-3xl font-black sm:text-5xl">リクエスト・お問い合わせ</h1>
      <p className="mt-6 leading-8">「地元のあのコースを載せてほしい」が、どこランを育てる一番の力になります。掲載リクエスト・情報の間違いの報告・その他のご意見、なんでもお送りください。</p>
      <div className="mt-10">
        <ContactForm initialCategory={initialCategory} initialMessage={params.message} />
      </div>
    </div>
  );
}
