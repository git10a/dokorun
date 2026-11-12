// data/articles/*.md (先頭に key: value のヘッダー、その後に本文)から、記事を下書きとして投入するSQLを作る。
// 使い方: node scripts/build-article-sql.mjs data/articles/<slug>.md > scripts/sql/<date>-article-<slug>.sql
//         node scripts/run-sql.mjs scripts/sql/<date>-article-<slug>.sql [--remote]
// 同じslugの記事が既にあれば何もしない(管理画面での編集を上書きしない)。
// 共有プレビュー用トークンはDB側で乱数から作るので、このSQLには含まれない。
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/build-article-sql.mjs <data/articles/slug.md>");
  process.exit(1);
}
const source = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
if (!match) throw new Error("先頭に --- で囲んだヘッダーが必要です");
const meta = Object.fromEntries(
  match[1].split("\n").map((line) => {
    const index = line.indexOf(": ");
    if (index < 0) throw new Error(`ヘッダーの書式が不正です: ${line}`);
    return [line.slice(0, index).trim(), line.slice(index + 2).trim()];
  }),
);
for (const key of ["slug", "title", "description"]) if (!meta[key]) throw new Error(`${key} がありません`);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.slug))
  throw new Error("slug は半角英小文字・数字とハイフンで指定してください");

const text = (value) => (value ? `'${value.replaceAll("'", "''")}'` : "NULL");
const columns = {
  id: text(randomUUID()),
  slug: text(meta.slug),
  race_slug: text(meta.raceSlug),
  title: text(meta.title),
  subtitle: text(meta.subtitle),
  body: text(match[2].trim()),
  speakers: text(meta.speakers),
  author: text(meta.author ?? "どこラン編集部"),
  description: text(meta.description),
  status: "'draft'",
  preview_token: "lower(hex(randomblob(16)))",
};
console.log(
  `INSERT INTO articles (${Object.keys(columns).join(", ")})\nVALUES (${Object.values(columns).join(", ")})\nON CONFLICT(slug) DO NOTHING;`,
);
