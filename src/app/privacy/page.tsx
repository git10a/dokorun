import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl space-y-7 px-4 py-12 leading-8 md:px-6"><h1 className="text-3xl font-black">プライバシーポリシー</h1><p>どこランは、サービス提供に必要な範囲で利用者情報を取り扱います。</p><section><h2 className="text-xl font-bold">取得する情報</h2><p>Googleログインから提供される氏名、メールアドレス、プロフィール画像、ならびに利用者が登録するプロフィール、走りたいスポット、走った記録を取得します。また、サービス改善のため、匿名のブラウザ識別子・セッション識別子、閲覧ページ、検索やナビ・ダウンロードなどの操作、参照元ドメイン、キャンペーン情報を取得します。</p></section><section><h2 className="text-xl font-bold">利用目的</h2><p>本人確認、会員機能の提供、不正利用の防止、利用状況の把握とサービス改善、問い合わせ対応のために利用します。法令に基づく場合を除き、本人の同意なく第三者へ提供しません。</p></section><section><h2 className="text-xl font-bold">外部サービス</h2><p>認証にはGoogle、データ保存と配信にはCloudflareを利用します。各サービスでの取扱いは、それぞれのプライバシーポリシーに従います。</p></section><p className="text-sm text-sub">制定日: 2026年7月8日<br />改定日: 2026年7月12日</p></article>;
}
