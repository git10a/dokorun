import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { Pool, neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

let database: Database | undefined;

const isWorkers = globalThis.navigator?.userAgent === "Cloudflare-Workers";

function requireUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL が設定されていません");
  }
  return process.env.DATABASE_URL;
}

function isNeon(url: string) {
  return new URL(url).hostname.endsWith(".neon.tech");
}

// 接続先ごとのドライバ:
// - Workers上のNeon: HTTPドライバ。WebSocket接続をモジュールスコープに持つと
//   「Cannot perform I/O on behalf of a different request」で落ちるため、
//   クエリごとに独立したfetchで完結するHTTPドライバのみキャッシュ可。
//   ただしtransaction()は使えない(トランザクションはwithTxDbを使う)。
// - NodeからのNeon(CLIスクリプト): WebSocketドライバ(wsで代替)。transaction可。
// - それ以外(ローカルDocker Postgres等): postgres-js。
export function getDb() {
  const url = requireUrl();
  // preview(workerd)からローカルPostgresへ接続する場合も、I/Oをリクエスト間で
  // 共有できない。短いアイドルタイムの接続をリクエスト内で作り直す。
  if (isWorkers && !isNeon(url)) {
    const client = postgres(url, { prepare: false, max: 1, idle_timeout: 1 });
    return drizzlePostgres(client, { schema }) as unknown as Database;
  }
  if (!database) {
    if (isNeon(url)) {
      if (isWorkers) {
        database = drizzleNeonHttp(neon(url), { schema }) as unknown as Database;
      } else {
        // Node 20にはWebSocketグローバルがないためwsで代替する
        if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = ws;
        database = drizzleNeon(new Pool({ connectionString: url }), { schema });
      }
    } else {
      const client = postgres(url, { prepare: false });
      // クエリAPIは同一のPgDatabase系のため、型はNeon側に揃える
      database = drizzlePostgres(client, { schema }) as unknown as Database;
    }
  }
  return database;
}

// トランザクションが必要な処理はこちらを使う。
// Workers上のNeonではリクエスト内で使い捨てのWebSocketプールを張り、終了時に閉じる
// (リクエストをまたいでI/Oを共有できないためキャッシュしない)。それ以外はgetDb()と同じ。
export async function withTxDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const url = requireUrl();
  if (isNeon(url) && isWorkers) {
    const pool = new Pool({ connectionString: url });
    try {
      return await fn(drizzleNeon(pool, { schema }));
    } finally {
      await pool.end();
    }
  }
  if (isWorkers) {
    const client = postgres(url, { prepare: false, max: 1 });
    try {
      const db = drizzlePostgres(client, { schema }) as unknown as Database;
      return await fn(db);
    } finally {
      await client.end();
    }
  }
  return fn(getDb());
}
