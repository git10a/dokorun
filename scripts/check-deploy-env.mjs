// deploy前ガード: ISR化によりビルド時にトップページとsitemapをプリレンダするため、
// ローカルDBのままビルドするとその内容が本番KV(incremental cache)にシードされ、
// dokorun.com がローカルのデータを配信してしまう。本番Neonを指すときだけ通す。
//
// DATABASE_URLはコマンドライン引数で渡さず、gitignore済みの.env.production(本人のみ読み書き
// 可能なパーミッション推奨)に置く。シェル履歴やプロセス一覧、ログへの平文露出を避けるため。
import { config } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env.production")) config({ path: ".env.production" });

const url = process.env.DATABASE_URL ?? "";
if (!/\.neon\.tech/.test(url)) {
  console.error(
    [
      "deployを中止しました: DATABASE_URL が本番Neonを指していません。",
      "ビルド時プリレンダ(トップ/sitemap)の内容が本番キャッシュにシードされるため、",
      "プロジェクト直下に.env.productionを作成し、本番のDATABASE_URLを設定してください:",
      "",
      "  echo \"DATABASE_URL=<本番NeonのURL>\" > .env.production",
      "  chmod 600 .env.production",
      "  npm run deploy",
    ].join("\n"),
  );
  process.exit(1);
}
