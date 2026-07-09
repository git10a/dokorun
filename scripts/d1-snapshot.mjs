// deploy前ガード兼スナップショット生成: 本番D1をエクスポートしてローカルsqliteに再構築する。
// ISR化によりビルド時にトップページとsitemapをプリレンダするため、ビルドは必ず
// 本番データのスナップショット(D1_LOCAL_PATH)を参照する。ローカルデータのままビルドすると
// その内容が本番KV(incremental cache)にシードされてしまう(旧check-deploy-env.mjsの役割)。
// 使い方: node scripts/d1-snapshot.mjs [出力先.sqlite]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const out = resolve(process.argv[2] ?? ".d1-build/prod.sqlite");
const sqlPath = out.replace(/\.sqlite$/, ".sql");
mkdirSync(dirname(out), { recursive: true });

try {
  execFileSync("npx", ["wrangler", "d1", "export", "dokorun-db", "--remote", "--output", sqlPath], { stdio: "inherit" });
} catch {
  console.error(
    [
      "deployを中止しました: 本番D1のエクスポートに失敗しました。",
      "`npx wrangler login` 済みか、ネットワークを確認してください。",
    ].join("\n"),
  );
  process.exit(1);
}

rmSync(out, { force: true });
const { createClient } = createRequire(import.meta.url)("@libsql/client");
const client = createClient({ url: `file:${out}` });
// exportはテーブルをアルファベット順に出力するため、FK先が未作成の時点でINSERTが走る。
// スナップショット再構築中はFKチェックを無効化する(D1本体では有効なので整合は保たれている)
await client.executeMultiple("PRAGMA foreign_keys=off;\n" + readFileSync(sqlPath, "utf8"));

// 中身が本番相当かの健全性チェック(空DBやテスト用DBでのビルドを防ぐ)
const spots = await client.execute("select count(*) as count from spots where is_published = 1");
const count = Number(spots.rows[0]?.count ?? 0);
client.close();
if (count < 100) {
  console.error(`deployを中止しました: スナップショットの公開スポットが${count}件しかありません(本番D1の内容を確認してください)`);
  process.exit(1);
}
console.log(`snapshot ok: ${out} (published spots: ${count})`);
