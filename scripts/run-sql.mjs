// SQLファイルをDATABASE_URLのDBへ適用する小さなランナー。
// 使い方: node scripts/run-sql.mjs <path/to/file.sql>
// 接続先は .env.local の DATABASE_URL(環境変数で上書き可)。
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run-sql.mjs <file.sql>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.unsafe(readFileSync(file, "utf8"));
  console.log(`applied: ${file}`);
} finally {
  await sql.end();
}
