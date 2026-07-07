import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="text-6xl font-black text-brand">404</p><h1 className="mt-4 text-2xl font-bold">ページが見つかりません</h1><Link href="/" className="mt-8 inline-block rounded-lg bg-brand px-5 py-3 font-bold">ホームへ戻る</Link></div>;
}
