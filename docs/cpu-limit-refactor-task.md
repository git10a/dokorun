# Workers CPU制限(10ms)対策リファクタリング 実装指示書 (2026-07-08)

実装エージェント向けの指示書。DESIGN.md・READMEの規約に従うこと。
pnpmがクラッシュする環境のため、コマンドはすべて `npm run ...` を使う。
他のエージェントが同リポジトリを並行編集することがあるため、編集前に対象ファイルの最新状態を確認する。

## 背景

本番(https://dokorun.com)はCloudflare Workers **無料プラン**で動いており、
1リクエストあたりのCPU時間上限が**10ms**しかない(超えると
`Worker exceeded resource limits` / エラー1102)。メモリ上限128MB超過でも同種のエラーになる。
I/O待ち(DBクエリの待機など)はCPU時間に**含まれない**。含まれるのは
JSONパース・Reactのサーバーレンダリング・座標計算などの純粋なJS実行時間。

このエラーを実質ゼロにするのがゴール。現状コードでCPUを食う箇所は調査済みで、重い順に:

1. **一覧系クエリが全コースの生geojsonをDBから取得してパースしている**
   [data.ts](../src/db/data.ts) の `summarySelection` に `courseGeojson: courses.geojson` が
   含まれるが、使い道は `addRelations()` 内の `hasCourse` の真偽値計算**だけ**。
   コースは最大3,708点・1件約90KB。検索ページは最大20件なので、1リクエストで
   数百KB〜1MB級のJSONをNeon HTTPドライバがパースして即捨てている。
   ホーム(13件)・検索(20件)・詳細ページの近隣スポット(4件)・マイページの全部に効いている。
   **これが10ms超過の最有力容疑**。
2. **詳細ページがリクエストごとにDouglas-Peucker簡略化を実行している**
   [data.ts:228](../src/db/data.ts) `getSpotBySlug()` が毎回
   `simplifyLine(row.geojson.coordinates, 0.00005)` を実行。3,708点のコースでは
   これ自体が数msかかりうる上、生geojsonのパースコストも乗る。
3. **GPXパースAPIが最大10MBのXMLを同期パースする**
   [api/gpx/parse/route.ts](../src/app/api/gpx/parse/route.ts) が管理画面からのGPXを
   `fast-xml-parser` でパース。10MB級ならCPU10msをほぼ確実に超え、メモリ超過の恐れもある。
   管理作業時にしか呼ばれないが、単発超過の筆頭。
4. **全ページ `force-dynamic` で毎リクエストSSRしている**
   home / spots / spots/[slug] / sitemap すべてに `export const dynamic = "force-dynamic"`。
   カード13〜20枚分のReactサーバーレンダリング+複数DBクエリの結果パースが毎回走る。
5. **ログインユーザーはページ表示のたびにBetter AuthがDBセッション照会**
   [user.ts](../src/lib/user.ts) の `getUser()` → `createAuth()` を毎回生成し
   `api.getSession()` がDBを引く。

対応はタスク0(計測)→1→2→3→4の順。**タスク1〜4は挙動を変えない安全な軽量化**で、
これだけで超過はほぼ消える見込み。タスク5(静的化)は効果最大だが設計判断を含むので、
タスク4まで完了後に計測を見て着手を判断する。

## 方針(全タスク共通)

- 「リクエスト毎に計算」を「書き込み時に前計算」へ寄せる。Workerの仕事は読むだけにする
- DBから取るカラムは使うものだけ。特にjsonbカラムは一覧系クエリに絶対含めない
- 変更のたびに `npm run lint` と `npm run test` を通すこと
- デプロイは手動(`npm run deploy`、node@23必須)。このタスクでは**デプロイまではしない**
  (ユーザーが行う)。ビルド確認は `npm run build` まで

---

## タスク0: 計測の記録(実装前ベースライン)

コード変更なし。ユーザー(人間)に以下を依頼するメモを残すだけでよい:

- Cloudflareダッシュボード → Workers & Pages → dokorun → Metrics で
  **CPU time の P50 / P99 / P99.9** と **Invocation Statuses の「Exceeded Resources」件数**を記録
- 各タスクのデプロイ後に同じ値を再取得して効果を確認する

受け入れ基準(最終): P99.9 CPU time < 10ms、Exceeded Resources が継続的に0件。

---

## タスク1: 一覧系クエリから生geojsonを追放する(最重要・低リスク)

### やること

1. [data.ts](../src/db/data.ts) の `summarySelection` から `courseGeojson: courses.geojson` を削除し、
   代わりにSQL側で真偽値を計算する:

   ```ts
   hasCourse: sql<boolean>`coalesce(jsonb_array_length(${courses.geojson}->'coordinates') > 0, false)`,
   ```

2. `addRelations()` を修正:
   - 型パラメータの `courseGeojson: LineString | null` 要件を `hasCourse: boolean` に置き換え
   - `const { courseGeojson, ...summary } = row;` と
     `hasCourse: Boolean(courseGeojson?.coordinates?.length)` の行を削除
     (`hasCourse` はSQLから来た値をそのまま通す)
3. `getSpotBySlug()` は詳細表示用に `geojson: courses.geojson` を明示selectしている。
   ここは表示に必要なので**残す**。ただし `addRelations([{ ...row, courseGeojson: row.geojson }])`
   の受け渡しを新しい形( `hasCourse` を渡す)に合わせて直す。
4. `SpotSummary` 型([types.ts](../src/lib/types.ts))に変更が要るか確認。`hasCourse: boolean` が
   既にあるなら型変更は不要のはず。

### 期待効果

一覧系リクエスト(ホーム・検索・詳細の近隣・マイページ)のDB応答が数百KB→数KBになり、
JSONパースのCPU(リクエストあたり数ms〜10ms級)が消える。

### 検証

- `npm run test`(既存テストがあれば)と `npm run lint`
- `npm run dev` でホーム・/spots・詳細ページのカード表示が変わらないこと。
  特に「写真なし・コースあり」スポットのカードに `/course-maps/<slug>.webp` が出続けること
  (= `hasCourse` が正しくtrueになっている)

---

## タスク2: 詳細ページの簡略化座標を書き込み時に前計算する

### やること

1. [schema.ts](../src/db/schema.ts) の `courses` に簡略化済み座標カラムを追加:

   ```ts
   geojsonSimplified: jsonb("geojson_simplified").$type<LineString | null>(),
   ```

2. 書き込み経路すべてで、`geojson` 保存時に
   `simplifyLine(coords, 0.00005)`([simplify.ts](../src/lib/simplify.ts))を適用した
   結果を `geojsonSimplified` にも保存する。書き込み経路は grep して洗い出すこと。
   最低限: [apply-gpx.ts](../scripts/apply-gpx.ts)、[import.ts](../src/db/import.ts)、
   管理画面のスポット保存アクション([admin/actions.ts](../src/app/admin/actions.ts))。
3. `getSpotBySlug()` は `geojsonSimplified` をselectし、リクエスト時の `simplifyLine` 呼び出しを削除。
   **フォールバック**: `geojsonSimplified` がnullの行は従来どおり `geojson` を簡略化して返す
   (バックフィル完了までの移行措置。生geojsonのselectはこのフォールバックのためだけに残すか、
   coalesceで済ませるかは実装判断でよい。理想は
   `coalesce(geojson_simplified, geojson)` を1カラムだけ取ること)。
4. バックフィルスクリプト `scripts/backfill-simplified-geojson.ts` を新規作成:
   全coursesを読み、`geojsonSimplified` がnullの行に簡略化結果をUPDATEする。
   ローカルからNeonへ直接実行する運用(`DATABASE_URL` 上書き)なのでNode実行前提でよい。
   `package.json` に `gpx:backfill` などのスクリプトを追加。
5. スキーマ反映は `npm run db:push`(drizzle-kit)。本番Neonへの適用はユーザーが行うので、
   実行手順をこのファイル末尾かPRの説明に明記すること。

### 期待効果

詳細ページから「生geojsonのフルパース+Douglas-Peucker実行」が消える。
簡略化後は tolerance 0.00005 で点数が大幅に減るため、jsonbパースも軽くなる。

### 検証

- 詳細ページの地図(CourseMap)の描画が変わらないこと
- 簡略化前後で `distanceM` 等のスペック表示に影響がないこと(距離はDB値なので影響なしのはず)

---

## タスク3: GPXパースをブラウザ側へ移す

### やること

1. [lib/gpx.ts](../src/lib/gpx.ts) の `parseGpx` ロジックを確認し、DOM非依存の純関数
   (座標配列→距離・獲得標高計算など)と、XMLパース部分を分離する。
2. 管理画面のGPXアップロードUI(grepで `api/gpx/parse` の呼び出し元を特定。
   おそらく [components/admin](../src/components/admin) 配下)を変更:
   - ファイルをサーバーへPOSTせず、ブラウザで `DOMParser` を使って `trkpt` を抽出
   - 距離・標高計算は共通純関数をクライアントでimportして実行
   - 結果(座標配列とスペック)を既存のserver actionへJSONで渡す
3. [api/gpx/parse/route.ts](../src/app/api/gpx/parse/route.ts) を削除し、
   [middleware.ts](../src/middleware.ts) のmatcherから `/api/gpx/:path*` を外す。
   `fast-xml-parser` がサーバーバンドルから消えるか確認
   (scripts側で使っているならdevDependency相当の位置づけになる。バンドルサイズ残120KiB問題にも効く)。

### 期待効果

10MB級XMLの同期パース(確実に10ms超え+メモリリスク)がWorkerから消える。

### 検証

- 管理画面でGPXを選択→スペックが従来どおり自動入力されること(ローカルで実際に操作して確認)
- 既存の `tests/` にgpx関連テストがあれば純関数分離後も通ること

---

## タスク4: Better Authのセッション照会コストを下げる

### やること

1. [better-auth.ts](../src/lib/better-auth.ts) の `betterAuth({...})` に cookieCache を追加:

   ```ts
   session: {
     cookieCache: { enabled: true, maxAge: 300 }, // 5分は署名付きcookieでDB照会を省略
   },
   ```

   注意: サインアウト後も最大5分間は他タブでセッションが生きて見える可能性がある。
   個人向けサービスとして許容範囲(コメントで明記しておく)。
2. `createAuth()` のインスタンスをWorkers+Neon(HTTPドライバ)の場合のみモジュールスコープに
   キャッシュする。[db/index.ts](../src/db/index.ts) の `getDb()` と同じ判定
   (`isWorkers && isNeon(url)`)を使い、その条件ではHTTPドライバなので
   リクエスト間共有が安全。ローカルpreview(workerd+ローカルPostgres)では従来どおり毎回生成。

### 期待効果

ログインユーザーの全SSRページで「betterAuth初期化+セッションDBクエリ+結果パース」が
リクエスト毎→5分に1回になる。

### 検証

- ローカルでGoogleログイン相当のフロー(またはセッションcookieの有無)で
  /me が正しく動くこと、ログアウトが機能すること

---

## タスク5: ページの静的化・ISR化(タスク4まで完了後、計測を見て判断)

タスク1〜4のデプロイ後もExceeded Resourcesが出る場合のみ着手。
効果は最大(SSR自体を消せる)だが、設計判断と運用変更を含む。

### 5a. 前提確認

`npm run build` の出力で about / terms / privacy が Static(○)になっているか確認。
なっていれば既に `.open-next/assets` から配信され、Worker CPUゼロのはず。

### 5b. `/spots/[slug]` のユーザー依存除去 → SSG化

現状 `force-dynamic` の理由は `getUser()` / `isHashiritaiForUser()` / searchParams(`logs`, `posted`)。
これらをクライアントへ移す:

- `HashiritaiButton` は既にクライアントコンポーネント。`initialLiked` / `loggedIn` を
  propsで受けるのをやめ、マウント後に `/api/hashiritai?slug=...` (既存routeをGET対応に拡張) から
  liked状態とカウントを取得する。SSR時はカウントのみ表示(ビルド時点の値)でよい
- 「走った記録を投稿」リンクはログイン分岐をやめ常に `/log/new` へ
  (未ログインなら遷移先の `requireUser` がloginへ飛ばす)
- `posted=1` バナーと `logs=all` の出し分けは `useSearchParams` を使う小さな
  クライアントコンポーネントに切り出す(「みんなのドコログ」セクションごとクライアントfetch化も可)
- ページから `getUser` 依存が消えたら `generateStaticParams`(全publishedスポットのslug)を追加し、
  `dynamic = "force-dynamic"` を削除して `revalidate` を設定

### 5c. incremental cacheの基盤

ISR(revalidate)を機能させるにはOpenNextのincremental cacheが必要:

- 第一候補はR2(`r2IncrementalCache`)だが、**R2はアカウント未有効**
  (有効化には支払い情報登録が必要)。ユーザーに有効化を依頼するか、
- KV(`kvIncrementalCache` + binding `NEXT_INC_CACHE_KV`)で始める。
  **無料枠は書き込み1,000/日**なので `revalidate` は86400(1日)など長めに設定する
- [open-next.config.ts](../open-next.config.ts):

  ```ts
  import { defineCloudflareConfig } from "@opennextjs/cloudflare";
  import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

  export default defineCloudflareConfig({
    incrementalCache: kvIncrementalCache,
    enableCacheInterception: true,
  });
  ```

- 実装前に @opennextjs/cloudflare の最新ドキュメントでAPI名・queue要件
  (時間ベースrevalidateにはqueueのdirectモード等が必要)を必ず確認すること

### 5d. その他

- [sitemap.ts](../src/app/sitemap.ts): `force-dynamic` → `revalidate = 86400`
- ホーム([page.tsx](../src/app/page.tsx)): `getUser` を使っていないので
  `force-dynamic` → `revalidate = 3600` にできる(5cの基盤が前提)
- `/spots`(検索)はクエリ依存なので動的のまま。タスク1で十分軽くなっている想定

### トレードオフの明記

- スポット追加・編集の反映が最大revalidate間隔まで遅れる(現運用は
  「ローカルスクリプトでNeon投入→手動デプロイ」なので、デプロイ時に再ビルドされ実害は小さい)
- ドコログ数・ハシリタイ数がビルド時点の値+クライアント更新になる

---

## 対象外(やらないこと)

- Workers有料プラン($5/月、CPU 30s)への移行 — 最終手段としては最も確実。
  タスク1〜5で解決しない場合の選択肢としてユーザーに提示するのみ
- Smart Placement、Hyperdrive — Neon HTTPドライバ+シンガポールリージョンの現構成を維持
- 画像最適化・バンドルサイズ削減 — 別タスク([perf-lightweight-task.md](./perf-lightweight-task.md))の範囲

## 実装メモ(2026-07-08)

- タスク0: デプロイ前後でCloudflare MetricsのCPU time P50 / P99 / P99.9 と Exceeded Resources件数を記録する。受け入れ目標は P99.9 CPU time < 10ms、Exceeded Resources継続0件。
- タスク1: 一覧系selectから生geojsonを外し、SQL側の `hasCourse` 真偽値だけを返す。
- タスク2: `courses.geojson_simplified` を追加し、GPX適用・管理画面保存・seedで簡略化済みgeojsonを保存する。既存行は下記バックフィルで埋める。
- タスク3: 管理画面のGPX解析はサーバーAPIを廃止し、ブラウザのDOMParserで実行する。
- タスク4: Better Authは5分の署名付きcookie cacheを有効化し、Workers+Neon HTTPドライバ時のみインスタンスをモジュールスコープで再利用する。
- このタスクでは本番デプロイしない。ローカル確認は `npm run lint`、`npm run test`、`npm run build` まで。

## 本番反映手順(ユーザー向けメモ)

1. タスク2のスキーマ変更を本番Neonへ: `DATABASE_URL=<本番> npm run db:push`
2. バックフィル: `DATABASE_URL=<本番> npm run gpx:backfill`
3. `npm run deploy`(node@23)
4. 24時間後にダッシュボードでCPU percentilesとExceeded Resourcesを確認、タスク0の値と比較
