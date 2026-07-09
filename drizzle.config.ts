import { defineConfig } from "drizzle-kit";

// D1(SQLite)用のDDL生成のみに使う(適用は wrangler d1 execute で行う)。
// 例: npx drizzle-kit generate → drizzle/0000_*.sql →
//     npx wrangler d1 execute dokorun-db --local --file drizzle/0000_*.sql
//     npx wrangler d1 execute dokorun-db --remote --file drizzle/0000_*.sql
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
