import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

let database: Database | undefined;

// Neonは本番(Cloudflare Workers)でTCPが使えないためWebSocketドライバで接続し、
// ローカルのDocker Postgresなどそれ以外のURLではpostgres-jsで接続する。
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL が設定されていません");
  }
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (new URL(url).hostname.endsWith(".neon.tech")) {
      // Node 20にはWebSocketグローバルがないためwsで代替する(Workersは組み込みWebSocket)
      if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
      database = drizzleNeon(new Pool({ connectionString: url }), { schema });
    } else {
      const client = postgres(url, { prepare: false });
      // クエリAPIは同一のPgDatabase系のため、型はNeon側に揃える
      database = drizzlePostgres(client, { schema }) as unknown as Database;
    }
  }
  return database;
}
