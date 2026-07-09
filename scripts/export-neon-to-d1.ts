// Neon(Postgres)の全データをD1(SQLite)投入用のINSERT文に変換して書き出す。
// 使い方: npx tsx scripts/export-neon-to-d1.ts <出力先.sql>
// DATABASE_URLは.env.production(なければ.env.local)から読む。
import { config } from "dotenv";
import { existsSync, writeFileSync } from "node:fs";
import postgres from "postgres";

if (existsSync(".env.production")) config({ path: ".env.production" });
config({ path: ".env.local" });
config();

const outPath = process.argv[2] ?? "d1-data.sql";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL がありません");

type Kind = "text" | "int" | "real" | "bool" | "ts" | "json";

// 挿入順はFK依存順(親→子)。カラム名はsnake_case(両スキーマで共通)
const tables: [string, Record<string, Kind>][] = [
  ["users", { id: "text", name: "text", email: "text", email_verified: "bool", image: "text", handle: "text", bio: "text", custom_avatar_at: "ts", instagram: "text", x_handle: "text", strava: "text", running_since_year: "int", running_since_month: "int", created_at: "ts", updated_at: "ts" }],
  ["spots", { id: "text", slug: "text", name: "text", name_kana: "text", prefecture: "text", city: "text", lat: "real", lng: "real", description: "text", access: "text", has_toilet: "bool", has_water_fountain: "bool", has_vending_machine: "bool", has_locker: "bool", has_shower: "bool", has_sento_nearby: "bool", has_parking: "bool", has_convenience_store: "bool", night_lighting: "text", track_usage: "json", is_published: "bool", created_at: "ts", updated_at: "ts" }],
  ["tags", { id: "text", slug: "text", name: "text", category: "text", sort_order: "int" }],
  ["communities", { id: "text", name: "text", description: "text", schedule: "text", instagram: "text", x_handle: "text", strava: "text", website: "text", is_published: "bool", created_at: "ts", updated_at: "ts" }],
  ["courses", { id: "text", spot_id: "text", name: "text", is_primary: "bool", geojson: "json", geojson_simplified: "json", distance_m: "int", elevation_gain_m: "int", course_type: "text", surface: "text", signals_count: "int", created_at: "ts" }],
  ["spot_tags", { spot_id: "text", tag_id: "text" }],
  ["photos", { id: "text", spot_id: "text", url: "text", caption: "text", sort_order: "int" }],
  ["spot_communities", { spot_id: "text", community_id: "text" }],
  ["user_avatars", { user_id: "text", data: "text", content_type: "text", updated_at: "ts" }],
  ["user_pbs", { id: "text", user_id: "text", event: "text", time_s: "int", competition_name: "text", created_at: "ts", updated_at: "ts" }],
  ["favorite_spots", { user_id: "text", spot_id: "text", created_at: "ts" }],
  ["run_days", { user_id: "text", day: "text", source: "text", created_at: "ts" }],
  ["sessions", { id: "text", expires_at: "ts", token: "text", created_at: "ts", updated_at: "ts", ip_address: "text", user_agent: "text", user_id: "text" }],
  ["accounts", { id: "text", account_id: "text", provider_id: "text", user_id: "text", access_token: "text", refresh_token: "text", id_token: "text", access_token_expires_at: "ts", refresh_token_expires_at: "ts", scope: "text", password: "text", created_at: "ts", updated_at: "ts" }],
  ["verifications", { id: "text", identifier: "text", value: "text", expires_at: "ts", created_at: "ts", updated_at: "ts" }],
  ["runs", { id: "text", user_id: "text", spot_id: "text", course_id: "text", ran_at: "ts", distance_m: "int", duration_s: "int", comment: "text", visibility: "text", created_at: "ts", updated_at: "ts" }],
  ["hashiritai", { client_id: "text", user_id: "text", spot_id: "text", created_at: "ts" }],
  ["feedback", { id: "text", category: "text", message: "text", contact: "text", created_at: "ts" }],
  ["events", { id: "text", name: "text", path: "text", meta: "json", created_at: "ts" }],
];

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function literal(value: unknown, kind: Kind): string {
  if (value === null || value === undefined) return "NULL";
  switch (kind) {
    case "bool": return value ? "1" : "0";
    // タイムスタンプはSELECT側でepochミリ秒(bigint)に変換済み
    case "ts": return String(value);
    case "json": return quote(JSON.stringify(value));
    case "int": case "real": return String(value);
    default: return quote(String(value));
  }
}

async function main() {
  const sql = postgres(url!, { prepare: false, max: 1 });
  const lines: string[] = ["PRAGMA defer_foreign_keys = on;"];
  for (const [table, columns] of tables) {
    const names = Object.keys(columns);
    // タイムスタンプはドライバのタイムゾーン解釈を避けるためDB側でUNIXミリ秒化し、
    // dateはtextで取り出す(drizzle sqliteのtimestamp_ms/textモードに対応)
    const selects = names.map((n) => {
      if (columns[n] === "ts") return `(extract(epoch from "${n}") * 1000)::bigint as "${n}"`;
      if (table === "run_days" && n === "day") return `to_char("${n}", 'YYYY-MM-DD') as "${n}"`;
      return `"${n}"`;
    });
    const rows = await sql.unsafe(`select ${selects.join(", ")} from "${table}" order by 1`);
    console.log(`${table}: ${rows.length} rows`);
    // D1のSQLステートメント上限は100KB。geojson等の巨大な行があるため、
    // 行数だけでなく合計サイズでもチャンクを区切る
    const insertHead = `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(",")}) VALUES\n`;
    let buffer: string[] = [];
    let bufferSize = 0;
    const flush = () => {
      if (buffer.length) lines.push(insertHead + buffer.join(",\n") + ";");
      buffer = [];
      bufferSize = 0;
    };
    for (const row of rows) {
      const value = `(${names.map((n) => literal(row[n], columns[n])).join(",")})`;
      if (buffer.length >= 40 || bufferSize + value.length > 80_000) flush();
      buffer.push(value);
      bufferSize += value.length;
    }
    flush();
  }
  await sql.end();
  writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`wrote ${outPath}`);
}

main();
