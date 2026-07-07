import { asc } from "drizzle-orm";
import { config } from "dotenv";
import { getDb } from ".";
import { spots } from "./schema";
import { prefectures } from "@/lib/prefectures";

config({ path: ".env.local" });
config();

// Deep Researchプロンプトの除外リストに貼る、登録済みスポット一覧を出力する
async function run() {
  const db = getDb();
  const rows = await db
    .select({ name: spots.name, prefecture: spots.prefecture, city: spots.city })
    .from(spots)
    .orderBy(asc(spots.prefecture), asc(spots.city));

  const order = new Map((prefectures as readonly string[]).map((p, i) => [p, i]));
  rows.sort((a, b) => (order.get(a.prefecture) ?? 99) - (order.get(b.prefecture) ?? 99));

  const byPrefecture = new Map<string, string[]>();
  for (const row of rows) {
    const list = byPrefecture.get(row.prefecture) ?? [];
    list.push(`${row.name}(${row.city})`);
    byPrefecture.set(row.prefecture, list);
  }

  console.log(`登録済みスポット: ${rows.length}件`);
  console.log();
  for (const [prefecture, names] of byPrefecture) {
    console.log(`- ${prefecture}: ${names.join("、")}`);
  }
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
