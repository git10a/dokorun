import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  // 時間ベースrevalidate用。現トラフィック(1.2万req/日)ならmemoryで十分
  queue: memoryQueue,
  // キャッシュヒット時にNextサーバーを起動せず返す=CPU大幅削減
  enableCacheInterception: true,
});
