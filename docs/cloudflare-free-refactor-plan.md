# Cloudflare無料プラン最適化リファクタ計画

実装担当への指示書。**デザイン・体験(見た目・表示内容・鮮度・操作感)は一切変えないこと**が絶対条件。
迷ったら「変えない」を優先し、体験が変わる可能性がある項目はスキップして報告する。

## 前提・制約

- 本番: https://dokorun.com (Cloudflare Workers 無料プラン + @opennextjs/cloudflare 1.20.1 + Neon Singapore)
- 無料プランの制約:
  - **CPU 10ms/リクエスト**(最重要。過去に超過して対策済みの経緯あり)
  - Workerリクエスト 10万/日(現状トラフィック約1.2万req/日)
  - Workerサイズ gzip 3MiB(minify必須で現在残り約87KiB。**依存追加は極力しない**)
  - KV: read 10万/日・**write 1,000/日**・1GB
- デプロイは手動: `npm run deploy`(node@23必須)。pnpmは使わずnpm。
- **作業ツリーに未コミットの変更あり**(src/app/page.tsx, src/app/spots/page.tsx, src/db/data.ts, docs/checkin-task.md)。別エージェントの並行作業の可能性があるため、現状のツリーを尊重し revert しない。

## 現状の問題(調査結果の要約)

1. **全主要ページが `force-dynamic`** で、キャッシュ戦略がゼロ(`revalidate` / `unstable_cache` / `generateStaticParams` はコードベースに1つも無い)。全PVが毎回Neonへの複数クエリ+SSRレンダリングになっている。
   - [src/app/page.tsx:9](../src/app/page.tsx) / [src/app/spots/page.tsx:10](../src/app/spots/page.tsx) / [src/app/spots/[slug]/page.tsx:22](../src/app/spots/%5Bslug%5D/page.tsx) / [src/app/sitemap.ts:4](../src/app/sitemap.ts)
2. **ISRの受け皿が未設定**: [open-next.config.ts](../open-next.config.ts) が `defineCloudflareConfig()` を引数なしで呼ぶだけ。incremental cacheが無いので `revalidate` を付けても永続化されない。
3. **1ページあたりのクエリ数が多い**: スポット詳細はログイン時 12〜13クエリ、トップは 7クエリ。N+1ではないが、photos/tags の取得([src/db/data.ts:54-57](../src/db/data.ts) `addRelations`)が同一ページ内で複数回走る、COUNTが別クエリ、などの統合余地がある。
4. `getSpotBySlug` に**リクエスト内 simplify** の分岐が残る([src/db/data.ts:260-261](../src/db/data.ts))。`geojson_simplified` が未バックフィルのスポットではDouglas-Peuckerが毎PV走りCPUを食う。
5. `package.json` に `"latest"` 指定の依存が多数(lucide-react / postgres / zod / @tailwindcss/postcss / tailwindcss / dotenv / drizzle-kit / typescript / tsx / fast-xml-parser / @types/*)。再インストールでWorkerサイズが突然増えるリスク。

---

## Phase 0: 低リスクの即効改善(体験不変が自明なもの)

### 0-1. スポット詳細のクエリ統合(12〜13 → 6〜7クエリ)

対象: [src/db/data.ts](../src/db/data.ts) の `getSpotBySlug`、[src/app/spots/[slug]/page.tsx](../src/app/spots/%5Bslug%5D/page.tsx)

- `getSpotBySlug`(data.ts:243-277)で `hashiritaiCount` と `runsCount` を別クエリ(data.ts:266-267)にせず、メインSELECTのスカラーサブクエリに畳む(−2クエリ)。
- `getSpotBySlug` 内で `addRelations` が photos を取得しているのに、直後に `allPhotos` を別クエリで再取得している(data.ts:263-265)。photos は1回だけ取得し、`photoUrl`(先頭写真)は `allPhotos[0]` から導出する(−1クエリ)。
- ページ側: `getNearbySpots`(page.tsx:45)が内部で別途 `addRelations` を呼ぶため photos/tags 取得が二重。spot本体とnearbyの行をまとめて1回の `addRelations` に通す形にリファクタ(−2クエリ)。関数のシグネチャを変える場合は他の呼び出し元(トップ等)に影響しないよう新関数か引数追加で。
- ログイン時のみの3クエリ `isHashiritaiForUser` / `isFavoriteForUser` / `getTodayRunId`(page.tsx:47-49)を、スカラーサブクエリ3つを持つ1クエリに統合(−2クエリ)。
- **返り値の内容・型・表示は完全一致させること。** 既存の vitest(`npm run test`)を通し、`npm run dev` でスポット詳細ページの表示(タグ・写真・ハシリタイ数・ランログ数・近くのスポット)が変わらないことを確認。

### 0-2. トップページのクエリ統合(7 → 5クエリ)

対象: [src/db/data.ts](../src/db/data.ts) `getPopularSpots` / `getNewestSpots`

- 両関数がそれぞれ `addRelations` を呼ぶ(data.ts:117, 136)。トップ用に「両方の行をまとめて1回の `addRelations` に通す」ヘルパーを作るか、`addRelations` を呼び出し側で1回にまとめる。表示順・件数のロジック(likeRank/curatedRank のソート)は一切変えない。

### 0-3. 匿名ユーザーの getUser() ファストパス

対象: [src/lib/user.ts:5-8](../src/lib/user.ts)

- セッションcookieが存在しない場合は better-auth の `getSession` を呼ばずに即 `null` を返す。cookie名は `dokorun.session_token`(本番は `__Secure-dokorun.session_token`。[src/lib/better-auth.ts:49](../src/lib/better-auth.ts) の cookiePrefix "dokorun" 参照)。`better-auth/cookies` の `getSessionCookie` 相当のチェックを `headers()`/`cookies()` に対して行う。
- SEO流入の大半は匿名なので、スポット詳細・プロフィールページの毎PVから better-auth 初期化+セッション処理を排除できる。**ログイン中の挙動は完全に従来通りであること**(両方のcookie名を確認)。

### 0-4. geojson_simplified の全件バックフィル確認

- `scripts/check-gpx.ts` / `scripts/backfill-simplified-geojson.ts` を確認し、本番Neon(`DATABASE_URL` を上書きして実行。docs/メモリの運用通り)に対して未バックフィルのスポットが無いか確認、あればバックフィルを実行。
- 併せて `scripts/apply-gpx.ts` が新規投入時に `geojson_simplified` を必ず書くことを確認(書いていなければ追記)。
- これにより [src/db/data.ts:260-261](../src/db/data.ts) のリクエスト内 `simplifyLine` 分岐が実行されなくなる(コードは安全網として残してよい)。

### 0-5. 依存バージョンのピン留め

対象: [package.json](../package.json)

- `"latest"` 指定の依存を、現在 `node_modules` にインストール済みのバージョンに固定する(`npm ls <pkg>` で確認し `^x.y.z` 形式に)。コード変更なし。`npm run build` が通ることを確認。

### 0-6. user_pbs のDDLをリクエストパスから排除

対象: [src/db/data.ts:95-101](../src/db/data.ts) `ensurePbCompetitionNameColumn`

- 本番Neonに対して `alter table user_pbs add column if not exists competition_name text` を一度手で流し(または drizzle migration)、`getUserPbs` からの `ensurePbCompetitionNameColumn()` 呼び出しを削除。リクエストパスでDDLを打つ構造をなくす。

### 0-7. /api/spots/map にブラウザキャッシュヘッダ

対象: [src/app/api/spots/map/route.ts:18](../src/app/api/spots/map/route.ts)

- レスポンスに `Cache-Control: public, max-age=300` を付与。同一ユーザーが検索ページを行き来した際の再フェッチ(=Worker request + Neonクエリ)を削減。5分以内のスポット新規公開が地図に出るのが遅れるだけで、体験上の差は実質ない。
- 注意: Workersカスタムドメインでは全リクエストがWorkerを通るため `s-maxage` によるエッジ削減は期待しない。ブラウザキャッシュ狙いのみ。

---

## Phase 1: キャッシュ基盤の導入 + 完全静的にできるものからISR化

**目的**: ISR/SSGの受け皿(KV incremental cache)を作り、cache interception でキャッシュヒット時のCPUをNext.jsサーバー起動なしのほぼゼロにする。

### 1-1. KV namespace 作成とバインディング

```
npx wrangler kv namespace create NEXT_INC_CACHE_KV
```

[wrangler.jsonc](../wrangler.jsonc) に追加(binding名は **`NEXT_INC_CACHE_KV`** 固定。@opennextjs/cloudflare の kv-incremental-cache が参照する):

```jsonc
"kv_namespaces": [
  { "binding": "NEXT_INC_CACHE_KV", "id": "<作成されたid>" }
]
```

`npm run cf-typegen` で cloudflare-env.d.ts を再生成。

### 1-2. open-next.config.ts の設定

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: memoryQueue, // 時間ベースrevalidate用。現トラフィック(1.2万req/日)ならmemoryで十分
  enableCacheInterception: true, // キャッシュヒット時にNextサーバーを起動せず返す=CPU大幅削減
});
```

- インストール済み v1.20.1 に上記overrideが存在することは確認済み(`node_modules/@opennextjs/cloudflare/dist/api/overrides/`)。実装時は同パッケージのドキュメントも参照のこと。
- タグキャッシュ(revalidateTag/revalidatePath)は**このPhaseでは導入しない**(時間ベースのみ)。

### 1-3. sitemap のISR化

対象: [src/app/sitemap.ts:4](../src/app/sitemap.ts)

- `export const dynamic = "force-dynamic"` を削除し `export const revalidate = 86400` に。クローラーアクセスのたびのNeonクエリが1日1回になる。体験影響: 新スポットのsitemap反映が最大1日遅れるのみ(Search Console運用上問題なし)。

### 1-4. トップページのISR化

対象: [src/app/page.tsx:9](../src/app/page.tsx)

- `force-dynamic` を削除し `export const revalidate = 3600` に。
- トップは `cookies()`/`headers()`/`searchParams` を一切読んでおらず、ヘッダーのユーザーメニューはクライアントコンポーネント([src/components/header.tsx](../src/components/header.tsx) → UserMenu)なので、**表示は誰にとっても同一 = ISRしても体験は変わらない**。
- 唯一の差分は「人気/新着スポット・件数の反映が最大1時間遅れる」こと。スポット追加は手動運用で頻度が低いため許容(発案者確認済みの前提でよいが、PRの説明に明記すること)。
- ビルド後 `.next` の出力でこのルートが ISR になっていること(`ƒ` でなく revalidate付き)を確認。

### 1-5. KV write 予算の確認(実装時にコメントとして残す)

- 無料プランのKV writeは **1,000/日**。想定書き込み: トップ 最大24/日 + sitemap 1/日 + デプロイ時のprerender済みページ(about/terms/privacy等 十数件)/回。十分余裕があるが、**revalidateを短くしすぎない**(300秒未満にしない)こと。

### 1-6. 検証

1. `npm run build` → Workerサイズが3MiB gzip以内であることを確認(deployログに出る。残余87KiB程度しかないので必ず確認)。
2. `npm run preview` で:
   - トップ初回アクセス→2回目がキャッシュから返ること(応答時間、およびNeonクエリが走らないこと)。
   - ログイン/ログアウトでヘッダーのユーザーメニューが従来通り切り替わること。
   - /spots(検索)・スポット詳細・/me 系が従来通り動的に動くこと。
3. デプロイ後、CloudflareダッシュボードのObservabilityでCPU時間の中央値/p99がPhase前より下がることを確認。

---

## Phase 2(提案のみ・今回は実装しない): スポット詳細のISR化

スポット詳細はSEO流入の主力で、ISR化すれば最大の削減になるが、**体験を厳密に不変に保つには大きな作り替えが必要**なため、Phase 0+1 の効果測定後に判断する。実装しない理由を残す:

- `searchParams`(?posted= のフラッシュメッセージ、?logs=all)をサーバーで読んでいるため、静的化するにはこれらをクライアント(`useSearchParams` + Suspense)へ移す必要がある。
- ログイン依存UI(ハシリタイ/お気に入り初期状態、今日のチェックイン、ランログの「編集」リンク)をクライアント取得に分離する必要があり、初期描画→状態反映のちらつきを完全に消す設計が要る。
- ランログ投稿・チェックイン直後に自分の投稿が即座に見える現在の体験を保つには、on-demand revalidation(`revalidatePath`)が必要で、それには D1 tag cache(`NEXT_TAG_CACHE_D1` + `d1NextTagCache`)の追加が要る(D1無料枠で可能)。
- 代わりに Phase 0 のクエリ統合 + 匿名ファストパスで、動的のままでも匿名PVのコストを大きく下げる。

## やらないこと(明示)

- `/api/track` の削除・サンプリング: 管理画面の統計(admin/stats)が events テーブルに依存しており、計測粒度を変えると管理体験が変わるため今回は触らない。リクエスト数が10万/日に近づいたら再検討。
- `next/image` への移行、R2導入、画像アップロード再有効化: R2未有効のため対象外。
- UIコンポーネントの見た目・マークアップ変更全般。
- maplibre-gl / lucide-react のimport方法変更(すでに動的import / named importで最適)。
- middleware の変更(matcherは /me, /admin, /api/upload のみで既に最小)。

## 実施順序と検証ゲート

1. Phase 0 を一括で実施 → `npm run lint` / `npm run test` / `npm run build` / `npm run preview` で全ページ目視確認。
2. Phase 1 を実施 → 上記 1-6 の検証。
3. デプロイは手動(`npm run deploy`、node@23)。デプロイ前にWorkerサイズを必ず確認。
4. 各Phaseは別コミットに分け、コミットメッセージに削減内容(クエリ数、キャッシュ対象)を記載。

## 実施結果と追加対応(2026-07-08 レビュー後)

Phase 0+1 実装後のレビューで発覚した問題への追加対応:

1. **Workerサイズ超過の解消**: レビュー時点で gzip 3256KiB(上限3072KiB超過)。原因はTurbopackがルートごとのサーバーチャンクに重い依存を複製し(@neondatabase ×7、better-auth ×6、zod ×6、kysely ×19 等)、OpenNextが全ルートを1 Workerに束ねる際に重複がそのまま乗るため。[next.config.ts](../next.config.ts) の `serverExternalPackages` で外部化し1回だけのバンドルに → **gzip 2339KiB(余裕733KiB)**。
   - **注意: `better-auth` は外部化禁止**。SSR中の `better-auth/react` が別Reactインスタンスを参照し `useRef` null でビルドが落ちる(実際に落ちた)。
   - さらに削減が必要になったら: maplibre-gl(SSRチャンクに約1MB raw混入)を `next/dynamic` の `ssr:false` で除外可(ハイドレーション前の見た目差異に注意)。
2. **ビルド時プリレンダのデータ源ガード**: ISR化によりトップ/sitemapがビルド時にプリレンダされ、deploy時に本番KVへシードされる。ローカルDBのままだとローカルデータが本番に出るため、[scripts/check-deploy-env.mjs](../scripts/check-deploy-env.mjs) を `predeploy` で実行し、DATABASE_URLが本番Neonでなければdeployを中止するようにした。**今後のデプロイは `DATABASE_URL='<本番Neon>' npm run deploy`**。
3. **スポット詳細の二重フェッチ解消**: `generateMetadata` と本体で `getSpotDetailWithNearby` を React `cache()` 共有(8→5クエリ)。`getSpotDetailWithNearby` 内のメインスポットphotos二重取得も解消。
4. **デプロイ前の本番DB作業(未実施・要手動)**:
   - `alter table user_pbs add column if not exists competition_name text;` を本番Neonに適用(遅延DDL削除の前提)
   - `DATABASE_URL='<本番Neon>' npm run gpx:check` → 未バックフィルがあれば `npm run gpx:backfill`

## 補足(監視のみ、コード変更不要)

- 画像変換 `/cdn-cgi/image/`([src/components/spot-image.tsx:8](../src/components/spot-image.tsx))は無料枠が**月5,000ユニーク変換**。スポット×写真×4幅で数千に達しうるので、ダッシュボード(Images → Transformations)で使用量を確認しておくこと。超過時は `NEXT_PUBLIC_IMAGE_TRANSFORM=off` で原画像配信に切り替えられる設計になっている。
