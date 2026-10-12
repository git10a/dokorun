import { createRequire } from "node:module";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzleD1<typeof schema>>;

export const isWorkersRuntime = globalThis.navigator?.userAgent === "Cloudflare-Workers";

let localFileDb: Database | undefined;

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

// miniflareが管理するローカルD1のsqliteファイル。
// 同じディレクトリに OpenNext のタグキャッシュ用D1(NEXT_TAG_CACHE_D1)と metadata.sqlite も並ぶため、
// 更新日時ではなくサイズで本体(数MB)を選ぶ。タグキャッシュは数十KB程度にしかならない
function findMiniflareD1Path(nodeRequire: NodeRequire): string | null {
  const fs = nodeRequire("node:fs") as typeof import("node:fs");
  const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
  if (!fs.existsSync(dir)) return null;
  const largest = fs.readdirSync(dir)
    .filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite")
    .map((file) => ({ file, size: fs.statSync(`${dir}/${file}`).size }))
    .sort((a, b) => b.size - a.size)[0];
  return largest ? `${dir}/${largest.file}` : null;
}

// WorkersのD1バインディングはリクエストに紐づくため、モジュールスコープでは保持しない。
// Nodeで動くビルド・CLI用のローカルsqliteだけは同一プロセス内で再利用してよい。
export function getDb(): Database {
  const boundDb = fromBinding();
  if (boundDb) return boundDb;
  localFileDb ??= fromLocalFile();
  return localFileDb;
}

// D1は対話的トランザクション(BEGIN/COMMIT)非対応。複数の書き込みを全部成功か全部失敗にしたいときは
// 文を先に組み立てて batch で一度に送る(D1・libsqlともに batch は1トランザクションで実行される)。
export async function runAtomically(statements: BatchItem<"sqlite">[]) {
  if (!statements.length) return;
  await getDb().batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

// drizzle はドライバのエラーを cause に包んで投げるため、両方を見て UNIQUE 制約違反か判定する
export function isUniqueViolation(error: unknown): boolean {
  const messages = [error, (error as { cause?: unknown })?.cause].map((value) => value instanceof Error ? value.message : String(value ?? ""));
  return messages.some((message) => /UNIQUE constraint failed/i.test(message));
}
