import type { Metadata } from "next";

export const metadata: Metadata = { title: "利用規約", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl space-y-7 px-4 py-12 leading-8 md:px-6"><h1 className="text-3xl font-black">利用規約</h1><p>この利用規約は、どこランが提供するサービスの利用条件を定めるものです。利用者は、本規約に同意したうえで本サービスを利用してください。</p><section><h2 className="text-xl font-bold">投稿について</h2><p>他者の権利を侵害する内容、誹謗中傷、虚偽、広告・勧誘、法令や公序良俗に反する内容は投稿できません。運営は、これらに該当すると判断した投稿を予告なく削除できるものとします。</p></section><section><h2 className="text-xl font-bold">免責</h2><p>掲載情報や利用者の投稿は、正確性・安全性を保証するものではありません。現地のルール、天候、交通状況、体調を確認し、安全を優先して利用してください。</p></section><p className="text-sm text-sub">制定日: 2026年7月8日</p></article>;
}
