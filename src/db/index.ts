import { createRequire } from "node:module";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzleD1<typeof schema>>;

export const isWorkersRuntime = globalThis.navigator?.userAgent === "Cloudflare-Workers";

let resolved: Database | undefined;

// 実行環境ごとの接続先:
// - Workers本番 / next dev: D1バインディング(getCloudflareContext経由)。
//   dev は initOpenNextCloudflareForDev がミニフレアのローカルD1を提供する。
// - ビルド時プリレンダ / CLIスクリプト(tsx): D1_LOCAL_PATH のsqliteファイルを
//   @libsql/client(NAPIなのでnodeバージョン差に強い)で直接開く。
//   deploy時は本番D1のスナップショット、ローカル作業時はminiflareのファイルを指す。
function fromBinding(): Database | null {
  try {
    const { env } = getCloudflareContext();
    const binding = (env as { DB?: D1Database }).DB;
    return binding ? drizzleD1(binding, { schema }) : null;
  } catch {
    return null; // リクエストコンテキスト外(ビルド時・スクリプト)
  }
}

function fromLocalFile(): Database {
  if (isWorkersRuntime) {
    throw new Error("D1バインディング(DB)が見つかりません。wrangler.jsonc の d1_databases を確認してください");
  }
  // ワーカーバンドルにネイティブ依存(@libsql/client)を含めないため、
  // bundlerの静的解析が届かないcreateRequire経由で読み込む
  const nodeRequire = createRequire(process.cwd() + "/");
  const path = process.env.D1_LOCAL_PATH ?? findMiniflareD1Path(nodeRequire);
  if (!path) {
    throw new Error(
      "ローカルD1が見つかりません。`npx wrangler d1 execute dokorun-db --local` で初期化するか、D1_LOCAL_PATH でsqliteファイルを指定してください",
    );
  }
  const { createClient } = nodeRequire("@libsql/client") as typeof import("@libsql/client");
  const { drizzle } = nodeRequire("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");
  return drizzle(createClient({ url: `file:${path}` }), { schema }) as unknown as Database;
}

// miniflareが管理するローカルD1のsqliteファイル(単一DB前提で最新のものを拾う)
function findMiniflareD1Path(nodeRequire: NodeRequire): string | null {
  const fs = nodeRequire("node:fs") as typeof import("node:fs");
  const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sqlite"));
  if (!files.length) return null;
  const newest = files
    .map((file) => ({ file, mtime: fs.statSync(`${dir}/${file}`).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];
  return `${dir}/${newest.file}`;
}

function resolveDb(): Database {
  if (!resolved) resolved = fromBinding() ?? fromLocalFile();
  return resolved;
}

// モジュールスコープで getDb() が呼ばれても(better-auth初期化など)、実際の接続解決は
// 最初のクエリまで遅延させる。Workersではリクエスト外にバインディングへ触れないため必須。
export function getDb(): Database {
  return new Proxy({} as Database, {
    get(_, prop) {
      const db = resolveDb();
      const value = db[prop as keyof Database];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(db) : value;
    },
  });
}

// D1は対話的トランザクション(BEGIN/COMMIT)非対応のため、逐次実行になる。
// better-authのtransaction:falseと同じ割り切り(admin系の低頻度操作でのみ使用)。
export async function withTxDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  return fn(getDb());
}
