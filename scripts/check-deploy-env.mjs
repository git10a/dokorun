// deploy前ガード: ISR化によりビルド時にトップページとsitemapをプリレンダするため、
// ローカルDBのままビルドするとその内容が本番KV(incremental cache)にシードされ、
// dokorun.com がローカルのデータを配信してしまう。本番Neonを指すときだけ通す。
const url = process.env.DATABASE_URL ?? "";
if (!/\.neon\.tech/.test(url)) {
  console.error(
    [
      "deployを中止しました: DATABASE_URL が本番Neonを指していません。",
      "ビルド時プリレンダ(トップ/sitemap)の内容が本番キャッシュにシードされるため、",
      "本番のDATABASE_URLを指定して実行してください:",
      "",
      "  DATABASE_URL='<本番NeonのURL>' npm run deploy",
    ].join("\n"),
  );
  process.exit(1);
}
