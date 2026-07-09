// SQLファイルをD1(dokorun-db)へ適用する小さなランナー。
// 使い方: node scripts/run-sql.mjs <path/to/file.sql> [--remote]
//   デフォルトはローカルD1(.wrangler/state)。--remote で本番D1に適用する。
// 注意: D1のSQLステートメント上限は100KB。巨大なINSERTは分割すること。
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("usage: node scripts/run-sql.mjs <file.sql> [--remote]");
  process.exit(1);
}

execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "dokorun-db", remote ? "--remote" : "--local", "--file", file, ...(remote ? ["-y"] : [])],
  { stdio: "inherit" },
);
console.log(`applied: ${file} (${remote ? "remote" : "local"})`);
