# どこラン (dokorun) — 設計書 v1.0

日本中のランニングスポットを集めるWebサービス。「サウナイキタイ」のランニング版。
この設計書は、実装エージェントが**追加の質問なしで完成まで実装できる**ことを目的に書かれている。

---

## 0. 実装エージェントへの指示

- この文書が唯一の仕様。ここに書かれた決定事項を再検討・再質問しないこと。
- 曖昧な点に遭遇したら、この文書の設計思想(§1)に沿う無難なデフォルトを選び、README の「実装メモ」節に選択内容を記録して先に進むこと。
- 実装順序は §12 のマイルストーン順に従う。各マイルストーンの受け入れ条件を満たしてから次へ進む。
- 完成の定義は §13。全項目を満たしたら完了。
- UIテキストはすべて日本語。コード(変数名・コメント)は英語。

---

## 1. プロダクト概要

### 1.1 コンセプト

- **一言で**: 「次はどこでランする？」に答える、日本全国のランニングスポットのデータベース + コミュニティ。
- **モデル**: サウナイキタイの構造をランニングに翻訳する。
  | サウナイキタイ | どこラン |
  |---|---|
  | 施設(サウナ) | **スポット**(皇居、駒沢公園、千波湖 など) |
  | 施設スペック(温度・水風呂) | **代表コースのスペック**(距離・高低差・信号数・路面) |
  | サ活 | **走リ活**(ラン記録の投稿) |
  | イキタイ | **ハシリタイ**(ブックマーク) |

### 1.2 設計思想(迷ったらここに立ち返る)

1. **スポットが主役、コースは属性。** ランニングコースは無限に引けるが、「走りに行く目的地」は有限。1スポットに代表コースを紐づけることで、レビュー・ブックマーク・検索が1ページに集約される。
2. **スポット登録は運営のみ。** データ品質を運営が担保する。一般ユーザーの貢献は走リ活・ハシリタイ(フェーズ2)。
3. **構造化データが命。** 「信号ゼロ」「フラット」「夜も明るい」で絞り込めることが最大の価値。自由文レビューより先にスペックを整備する。
4. **登録の手間を最小化。** GPXをアップロードすれば距離・高低差・周回判定が自動計算され、残りはタグをポチポチ選ぶだけ。

### 1.3 スコープ

- **今回実装する範囲(MVP)**: スポットの閲覧・検索・詳細表示、運営用の登録/編集(GPX対応)、シードデータ投入。
- **フェーズ2(今回は実装しない。ただしDBスキーマは今回作る)**: ユーザー認証、ハシリタイ、走リ活投稿。
- **フェーズ3(スキーマも作らない)**: Strava連携、スポットリクエスト、ランキング。

---

## 2. 技術スタック(確定事項)

| 領域 | 選定 | 備考 |
|---|---|---|
| フレームワーク | Next.js 最新版 (App Router, TypeScript) | `create-next-app` で初期化 |
| スタイリング | Tailwind CSS v4 | デザイントークンは §9 |
| DB | Neon Postgres (Vercel Marketplace) | ローカル開発も `DATABASE_URL` で接続 |
| ORM | Drizzle ORM + drizzle-kit | マイグレーションは `drizzle-kit push` でよい |
| 地図 | MapLibre GL JS | タイルは OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`)。APIキー不要・無料 |
| アイコン | lucide-react | |
| GPXパース | fast-xml-parser | 距離・高低差計算は自前実装(§8) |
| バリデーション | zod | フォーム・API入力 |
| 画像 | @vercel/blob (トークンがあれば)。なければURL直接入力にフォールバック | §7.4 |
| フォント | Noto Sans JP (next/font/google) | |
| デプロイ | Vercel | |
| パッケージマネージャ | pnpm | |

**認証(MVP)**: 運営用の簡易認証のみ。`ADMIN_PASSWORD` 環境変数と照合し、HMAC署名付きのhttpOnly Cookieを発行。`middleware.ts` で `/admin/*`(`/admin/login` 除く)をガード。NextAuth等は入れない。

**環境変数**:
```
DATABASE_URL=          # Neon Postgres
ADMIN_PASSWORD=        # 運営ログイン用
SESSION_SECRET=        # Cookie署名用(32文字以上のランダム文字列)
BLOB_READ_WRITE_TOKEN= # 任意。なければ画像はURL入力
```
`.env.example` を必ず作成すること。

---

## 3. 用語・エンティティ定義

- **スポット (spot)**: 走りに行く目的地。例: 皇居、駒沢オリンピック公園、千波湖。位置(緯度経度)、設備、環境属性、タグ、写真を持つ。
- **コース (course)**: スポットに紐づくルート。DB上は1対多だが、MVPでは各スポットに代表コース1本のみ登録・表示する(`isPrimary = true`)。ルート形状(GeoJSON LineString)、距離、高低差、形状タイプ、路面、信号数を持つ。GPXがない場合ルート形状はnull可(距離などは手入力)。
- **タグ (tag)**: スポットの特徴を表すラベル。マスタは運営管理(§6.4)。
- **走リ活 (run)** / **ハシリタイ (hashiritai)**: フェーズ2。スキーマのみ今回作成。

---

## 4. データモデル

Drizzleスキーマ(`src/db/schema.ts`)。これをそのまま実装する。

```ts
import { pgTable, uuid, text, integer, doublePrecision, boolean,
         timestamp, jsonb, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

export const courseTypeEnum = pgEnum("course_type", ["loop", "out_and_back", "one_way", "track"]);
export const surfaceEnum = pgEnum("surface", ["asphalt", "dirt", "track", "trail", "mixed"]);
export const lightingEnum = pgEnum("lighting", ["bright", "partial", "dark"]);
export const tagCategoryEnum = pgEnum("tag_category", ["terrain", "environment", "scenery"]);

export const spots = pgTable("spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),          // 例: "kokyo", "senbako"
  name: text("name").notNull(),                   // 例: "皇居"
  nameKana: text("name_kana").notNull(),          // 例: "こうきょ"
  prefecture: text("prefecture").notNull(),       // 例: "東京都"(47都道府県の正式名)
  city: text("city").notNull(),                   // 例: "千代田区"
  lat: doublePrecision("lat").notNull(),          // スポット代表点(スタート地点推奨)
  lng: doublePrecision("lng").notNull(),
  description: text("description").notNull(),     // 紹介文(200〜400字目安)
  access: text("access"),                          // アクセス(最寄駅など)
  // 設備
  hasToilet: boolean("has_toilet").notNull().default(false),
  hasWaterFountain: boolean("has_water_fountain").notNull().default(false),
  hasVendingMachine: boolean("has_vending_machine").notNull().default(false),
  hasLocker: boolean("has_locker").notNull().default(false),        // ランステ含む
  hasShower: boolean("has_shower").notNull().default(false),
  hasSentoNearby: boolean("has_sento_nearby").notNull().default(false), // 銭湯・サウナが近い
  hasParking: boolean("has_parking").notNull().default(false),
  hasConvenienceStore: boolean("has_convenience_store").notNull().default(false),
  // 環境
  nightLighting: lightingEnum("night_lighting"),  // 夜間の明るさ(不明ならnull)
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("spots_prefecture_idx").on(t.prefecture)]);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("代表コース"),
  isPrimary: boolean("is_primary").notNull().default(true),
  geojson: jsonb("geojson"),                      // GeoJSON LineString。GPX未登録ならnull
  distanceM: integer("distance_m").notNull(),     // 1周 or 片道の距離(メートル)
  elevationGainM: integer("elevation_gain_m"),    // 獲得標高。不明ならnull
  courseType: courseTypeEnum("course_type").notNull(),
  surface: surfaceEnum("surface").notNull(),
  signalsCount: integer("signals_count"),         // コース上の信号数。不明ならnull
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),                   // 例: "信号ゼロ"
  category: tagCategoryEnum("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const spotTags = pgTable("spot_tags", {
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [uniqueIndex("spot_tags_pk").on(t.spotId, t.tagId)]);

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---- フェーズ2(スキーマのみ作成、今回UIは実装しない) ----
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const runs = pgTable("runs", {                 // 走リ活
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  spotId: uuid("spot_id").notNull().references(() => spots.id),
  ranAt: timestamp("ran_at").notNull(),
  distanceM: integer("distance_m"),
  durationS: integer("duration_s"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("runs_spot_idx").on(t.spotId)]);

export const hashiritai = pgTable("hashiritai", {     // ブックマーク
  userId: uuid("user_id").notNull().references(() => users.id),
  spotId: uuid("spot_id").notNull().references(() => spots.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("hashiritai_pk").on(t.userId, t.spotId)]);
```

### 4.1 タグマスタ(シードで投入)

| category | slug | name |
|---|---|---|
| terrain | no-signals | 信号ゼロ |
| terrain | flat | フラット |
| terrain | hilly | 坂練向き |
| terrain | dirt-path | 土の路面 |
| terrain | dedicated-lane | 専用レーンあり |
| terrain | track | トラックあり |
| terrain | cross-country | クロカンコース |
| environment | bright-at-night | 夜も明るい |
| environment | shaded | 木陰が多い |
| environment | less-crowded | 混みにくい |
| environment | water-refill | 給水しやすい |
| scenery | waterside | 湖畔・水辺 |
| scenery | riverside | 河川敷 |
| scenery | park | 公園 |
| scenery | scenic | 景色が良い |
| scenery | cherry-blossoms | 桜の名所 |

---

## 5. URL設計・画面一覧

| URL | 画面 | 認証 |
|---|---|---|
| `/` | ホーム | 不要 |
| `/spots` | スポット検索(一覧+地図) | 不要 |
| `/spots/[slug]` | スポット詳細 | 不要 |
| `/about` | サービス紹介 | 不要 |
| `/admin/login` | 運営ログイン | 不要 |
| `/admin` | 管理: スポット一覧 | 要 |
| `/admin/spots/new` | 管理: スポット新規登録 | 要 |
| `/admin/spots/[id]/edit` | 管理: スポット編集 | 要 |
| `/api/gpx/parse` (POST) | GPX解析API | 要 |

検索条件はすべてクエリパラメータで表現し、URL共有可能にする:
`/spots?pref=東京都&tags=no-signals,flat&type=loop&dist_min=2&dist_max=6&q=皇居&sort=new&page=1`

---

## 6. 画面仕様

全画面共通: モバイルファースト。ブレークポイントは Tailwind デフォルト(`md:768px` でPCレイアウトに切替)。

### 6.0 共通レイアウト

**ヘッダー**(全ページ、sticky):
- 左: ロゴ。黄色(`brand`)の角丸四角に黒でランナーの絵文字的アイコン(lucideの `Footprints`)+ 太字テキスト「どこラン」。クリックで `/`。
- 右: 「スポットをさがす」(`/spots`)、「このサイトについて」(`/about`)。モバイルではテキストリンク2つをそのまま並べてよい(ハンバーガー不要)。

**フッター**: ロゴ、コピーライト、「運営者向け」として `/admin` への小さなリンク。

### 6.1 ホーム `/`

サウナイキタイのトップ同様、「即検索できること」を最優先。上から:

1. **ヒーローセクション**: 背景 `brand`(黄)。中央にキャッチコピー
   - 大見出し: 「次はどこでランする？」
   - 小見出し: 「日本全国のランニングスポットをあつめるサイト」
2. **検索ボックス**(ヒーロー内に重ねる、白カード):
   - キーワード入力(スポット名・市区町村) + 都道府県セレクト + 「さがす」ボタン → `/spots?q=&pref=` へ遷移
3. **タグからさがす**: タグマスタ全件をチップで並べる。クリックで `/spots?tags=xxx`。
4. **新着スポット**: 最新8件をスポットカード(§6.2)のグリッドで。 「すべて見る →」リンク。
5. **エリアからさがす**: 地方ブロック(北海道・東北 / 関東 / 中部 / 近畿 / 中国・四国 / 九州・沖縄)ごとに、**スポットが1件以上ある都道府県のみ**「東京都 (12)」形式で件数付きリンクを並べる。

### 6.2 スポットカード(共通コンポーネント)

一覧・ホームで使う。サウナイキタイの施設カードのオマージュ:

```
┌──────────────────────────┐
│ [写真 16:9 / なければプレースホルダー] │
│ 東京都 千代田区                    │ ← 小さくグレー
│ 皇居                              │ ← 太字 text-lg
│ 1周 5.0km ・ 周回 ・ 舗装路        │ ← 距離は brand色の太字で強調
│ [信号ゼロ][夜も明るい][定番]        │ ← タグチップ最大3個
│ 🚻 🚰 🔒 ♨️                       │ ← 保有設備のアイコンのみ表示
└──────────────────────────┘
```

- 写真プレースホルダー: `brand`の薄色背景 + 中央に `Footprints` アイコン。
- カード全体がリンク(`/spots/[slug]`)。

### 6.3 スポット検索 `/spots`

- **PC**: 左60%がリスト、右40%が地図(sticky)。**モバイル**: リストのみ+右下に「地図で見る」フローティングボタンで全画面地図に切替(トグル)。
- **フィルターバー**(リスト上部):
  - 都道府県セレクト / タグ(複数選択チップ、AND条件) / コース形状(周回・往復・ワンウェイ・トラック) / 距離レンジ(「〜3km」「3〜5km」「5〜10km」「10km〜」のプリセット) / 設備(トイレ・ロッカー・銭湯近くの3つだけチェックボックスで露出)
  - 適用中の条件はチップ表示し、×で個別解除。「条件をクリア」リンク。
- **並び順**: 新着順(デフォルト) / コース距離が短い順 / 長い順。
- **件数表示**: 「◯件のスポット」。
- **ページネーション**: 20件/ページ。
- **地図**: 結果全件のピン(黄色サークルマーカー)。ピンクリックでポップアップ(スポット名+距離+詳細リンク)。結果に合わせて `fitBounds`。
- **0件時**: 「条件に合うスポットが見つかりませんでした」+ 掲載リクエスト導線 + 条件クリアボタン。
- 検索はサーバーサイド(Server Component + searchParams)。Drizzleで WHERE を組み立てる。タグはANDなので `GROUP BY spot HAVING count = タグ数` 方式で。

### 6.4 スポット詳細 `/spots/[slug]`

上から順に:

1. **タイトルブロック**: 都道府県・市区町村(小、グレー) / スポット名(h1、太字大) / かな(小) / タグチップ全件。
2. **アクションバー**: 「ハシリタイ ♥ 0」ボタン(brand色アウトライン、カウントは `hashiritai` テーブルの実カウント)。**MVPではクリック時にツールチップ/トーストで「ログイン機能は準備中です」と表示するだけ**。隣に「走リ活 0」の静的カウント。
3. **写真ギャラリー**: 横スクロールで全写真。0枚ならプレースホルダー1枚。
4. **コースマップ**: MapLibre。`geojson` があれば LineString を `ink`色・太さ4で描画し、スタート地点に緑マーカー、`fitBounds`。なければスポット代表点にピンのみ。
5. **コーススペック**(このページの主役。サウナイキタイの温度表示のオマージュで、数字をとにかく大きく):
   ```
   ┌────────┬────────┬────────┐
   │  距離      │  獲得標高    │  信号        │
   │  5.0 km   │  32 m      │  0 箇所      │  ← 数字はtext-4xl太字、単位は小さく
   ├────────┴────────┴────────┤
   │ 形状: 周回 ／ 路面: 舗装路              │
   └─────────────────────────┘
   ```
   null の項目は「—」表示。夜間の明るさもここに表示(bright=「夜も明るい」/ partial=「一部照明あり」/ dark=「夜は暗い」)。
6. **設備**: 8設備を4列グリッドで、アイコン+名称。あり=ink色、なし=薄グレー+取り消し表現。
   - トイレ `Toilet` / 水飲み場 `GlassWater` / 自販機 `Coffee` / ロッカー `Lock` / シャワー `ShowerHead` / 銭湯・サウナ近く `Bath` / 駐車場 `SquareParking` / コンビニ `Store`
7. **紹介文・アクセス**: description と access を段落表示。
8. **走リ活セクション**: 見出し「走リ活」。MVPでは空状態のみ:「まだ走リ活はありません。投稿機能は準備中です 🏃」
9. **近くのスポット**: 同一都道府県の他スポットを最大4件、カードで。

**SEO**: `generateMetadata` で `「皇居のランニングコース - どこラン」` 形式のtitle、descriptionにスペック要約(「1周5.0km・信号ゼロ・夜も明るい。」+紹介文冒頭)。OGP画像は写真1枚目 or デフォルト画像。

### 6.5 管理画面 `/admin/*`

デザインは簡素でよい(白背景+フォーム)。ただし使いやすさは担保する。

- **`/admin/login`**: パスワード入力のみ。Server Actionで `ADMIN_PASSWORD` と照合 → 一致したら `SESSION_SECRET` でHMAC署名したトークンをhttpOnly Cookie(7日)にセットし `/admin` へ。失敗時はエラーメッセージ。
- **`/admin`**: スポット一覧テーブル(名前・都道府県・距離・公開状態・編集リンク)+「新規登録」ボタン。行ごとに削除ボタン(confirm付き)。
- **`/admin/spots/new`**: 登録フォーム。1ページ内で以下の流れ:
  1. **GPXアップロード(任意)**: ファイル選択 → `POST /api/gpx/parse` → 返ってきた GeoJSON をプレビュー地図に描画し、距離・獲得標高・形状タイプ・スタート地点(lat/lng)をフォームに**自動入力**(手修正可能)。「GPXなしで登録」も可能(その場合、地図クリックで代表点lat/lngを指定し、距離は手入力)。
  2. **基本情報**: 名前・かな・slug(名前から自動生成候補、編集可)・都道府県(セレクト)・市区町村・紹介文・アクセス。
  3. **コース情報**: 距離(km表示、内部はm)・獲得標高・形状・路面・信号数。
  4. **タグ**: チップをトグル選択。 **設備**: チェックボックス8個。 **夜間の明るさ**: ラジオ3択+未設定。
  5. **写真**: `BLOB_READ_WRITE_TOKEN` があればファイルアップロード(@vercel/blob, `access: "public"`)、なければURL入力欄。複数可、キャプション任意。
  6. 保存 → Server Action でzodバリデーション → spots + courses + spot_tags + photos をトランザクションで作成 → `/admin` へリダイレクト+成功メッセージ。
- **`/admin/spots/[id]/edit`**: 同フォームの編集版。GPX再アップロードでコース差し替え可。

### 6.6 `/about`

静的1ページ。サービスコンセプト(§1.1の内容を平易に)、「スポット掲載のリクエストは準備中です」、運営連絡先プレースホルダー。

---

## 7. API・サーバー処理仕様

### 7.1 `POST /api/gpx/parse`

- 認証: 管理Cookie必須(なければ401)。
- 入力: `multipart/form-data` の `file`(.gpx、最大10MB)。
- 処理: §8 のアルゴリズムで解析。
- 出力(200):
  ```json
  {
    "geojson": { "type": "LineString", "coordinates": [[lng, lat], ...] },
    "distanceM": 5012,
    "elevationGainM": 32,
    "suggestedCourseType": "loop",
    "startPoint": { "lat": 35.685, "lng": 139.7528 }
  }
  ```
- パース不能・trkptなし → 400 `{ "error": "GPXファイルを解析できませんでした" }`。

### 7.2 データ取得

公開ページはすべて Server Components から Drizzle で直接クエリ。API Route は作らない(GPX解析と画像アップロードを除く)。

### 7.3 ミューテーション

Server Actions(`src/app/admin/actions.ts`)に集約: `login`, `logout`, `createSpot`, `updateSpot`, `deleteSpot`。すべて冒頭で管理セッション検証。入力はzodスキーマで検証し、失敗時はフィールドごとのエラーメッセージを返してフォームに表示。

### 7.4 画像アップロード

`BLOB_READ_WRITE_TOKEN` が設定されている場合のみ、クライアントから `@vercel/blob/client` の `upload()`(handleUploadルート `/api/blob/upload`、管理Cookie検証付き)を使う。未設定ならフォームはURL入力欄を表示する(判定はサーバーで `process.env` を見てpropsで渡す)。

---

## 8. GPX解析アルゴリズム(`src/lib/gpx.ts`)

純関数で実装し、ユニットテスト対象とする。

1. **パース**: fast-xml-parser で `<trk><trkseg><trkpt lat lon><ele>` を全セグメント連結で抽出。`<rte><rtept>` しかないGPXにも対応。ポイント2個未満はエラー。
2. **距離**: 隣接点間のHaversine距離(地球半径 6371000m)の累積。整数mに丸め。
3. **獲得標高**: `ele` が全点に存在する場合のみ計算(なければnull)。移動平均(窓5)で平滑化後、正の増分のみ合計。整数mに丸め。
4. **簡略化**: Ramer–Douglas–Peucker、許容誤差 0.00005度(約5m)。結果が2000点を超える場合は許容誤差を2倍にして再実行(上限まで繰り返し)。
5. **周回判定**: 始点と終点の距離が150m以内 → `loop` を提案。それ以外 → `out_and_back` を提案(管理者がフォームで修正する前提の提案値)。
6. **出力**: GeoJSON LineString(座標順序は `[lng, lat]`)、`distanceM`、`elevationGainM`、`suggestedCourseType`、`startPoint`。

ユニットテスト(vitest): 直線2点間の距離が期待値±1%、周回GPXでloop判定、ele欠損でelevationGainM=null、壊れたXMLでエラー、の4ケース以上。

---

## 9. デザインシステム

サウナイキタイを参考にした「黄色 × 黒 × 白」のポップで実用的なトーン。ロゴ・図案のコピーはしない(色使いと情報設計の思想を借りる)。

### 9.1 カラートークン(Tailwind v4 の `@theme` で定義)

| トークン | 値 | 用途 |
|---|---|---|
| `brand` | `#FFD900` | ブランド黄。ヒーロー背景、ロゴ、距離数字、主要ボタン |
| `brand-dark` | `#E8C500` | 黄ボタンのhover |
| `ink` | `#1A1A1A` | 見出し・本文・ルート線 |
| `sub` | `#6B7280` | 補助テキスト |
| `paper` | `#FFFFFF` | 基本背景 |
| `cream` | `#F7F5EF` | セクション背景・チップ背景 |
| `line` | `#E5E2D9` | 罫線・カード枠 |
| `accent` | `#1A7DC4` | リンク、地図スタートマーカー以外の強調 |
| `danger` | `#D64545` | 削除・エラー |

### 9.2 コンポーネント指針

- **ボタン**: 主要=brand背景+ink文字+角丸`rounded-lg`+太字。副次=白背景+line枠。
- **タグチップ**: cream背景、ink文字、`rounded-full`、`text-sm`。選択状態はbrand背景。
- **カード**: 白背景、line 1px枠、`rounded-xl`、hoverで `shadow-md`。
- **数字の強調**: スペック数値は `font-bold` + 大きめサイズ + 単位だけ `text-sm text-sub`。ここがサウナイキタイらしさの核なので必ず実装する。
- **見出し**: セクション見出しは左にbrand色の縦棒(`border-l-4 border-brand pl-3`)。
- 角丸・余白は全体的に大きめ、線は細く。フラットで影は控えめ。

### 9.3 地図スタイル

- タイル: OpenFreeMap liberty。attribution表示必須(「© OpenStreetMap contributors」)。
- ルート線: ink色 / 幅4 / 不透明度0.85。スタート地点: `#2BA84A` の円マーカー(白枠)。一覧のピン: brand色の円マーカー(ink枠)。
- MapLibreはSSR不可のため、地図コンポーネントは `"use client"` + dynamic import(`ssr: false`)でラップする。

---

## 10. ディレクトリ構成

```
src/
  app/
    layout.tsx / globals.css
    page.tsx                       # ホーム
    about/page.tsx
    spots/page.tsx                 # 検索
    spots/[slug]/page.tsx          # 詳細
    admin/
      login/page.tsx
      page.tsx
      actions.ts                   # Server Actions
      spots/new/page.tsx
      spots/[id]/edit/page.tsx
    api/
      gpx/parse/route.ts
      blob/upload/route.ts         # Blobトークンがある場合のみ有効
  components/
    header.tsx / footer.tsx
    spot-card.tsx / tag-chip.tsx / facility-icons.tsx / spec-panel.tsx
    map/course-map.tsx             # 詳細用(ルート描画)
    map/spots-map.tsx              # 一覧用(ピン)
    search-filters.tsx
    admin/spot-form.tsx / gpx-uploader.tsx
  db/
    index.ts / schema.ts / seed.ts
  lib/
    gpx.ts / geo.ts / auth.ts / prefectures.ts   # 47都道府県+地方ブロック定数
  middleware.ts
tests/gpx.test.ts
drizzle.config.ts
.env.example
README.md
DESIGN.md (この文書)
```

---

## 11. シードデータ(`pnpm db:seed` で投入)

タグマスタ(§4.1全16件)と、以下の8スポットを投入する。

**注意**: 座標・距離は概算値。コースの `geojson` は、各スポットの周回路をおおまかになぞった10〜30点程度のLineStringを**シードスクリプト内に手書きで定義**する(正確さより「地図上でそれらしく見える」ことを優先。将来運営が実GPXで差し替える)。ワンポイントの `description` は下記の要点を元に自然な紹介文(200字前後)に膨らませて書くこと。

| slug | 名前 | 都道府県/市区 | 代表点(lat,lng) | 距離 | 形状 | 路面 | 信号 | 高低差 | タグ | 設備・要点 |
|---|---|---|---|---|---|---|---|---|---|---|
| kokyo | 皇居 | 東京都/千代田区 | 35.6825, 139.7521 | 5.0km | loop | asphalt | 0 | 約30m | no-signals, bright-at-night, scenic | トイレ○ 水飲み場○ ロッカー○(周辺ランステ) 銭湯近く○。日本で最も有名な周回コース。反時計回りが暗黙ルール。竹橋〜半蔵門が上り |
| komazawa | 駒沢オリンピック公園 | 東京都/世田谷区 | 35.6254, 139.6610 | 2.14km | loop | asphalt | 0 | ほぼ0 | no-signals, flat, dedicated-lane | トイレ○ 水飲み場○ 自販機○。ジョギング専用レーンあり。距離表示が100mごと |
| yoyogi | 代々木公園 | 東京都/渋谷区 | 35.6717, 139.6949 | 1.8km | loop | asphalt | 0 | 約10m | park, shaded, water-refill | トイレ○ 水飲み場○ 自販機○。木陰が多く夏に強い。織田フィールド(トラック)が隣接 |
| arakawa | 荒川河川敷(赤羽) | 東京都/北区 | 35.7794, 139.7196 | 10.0km | out_and_back | asphalt | 0 | ほぼ0 | riverside, no-signals, flat | トイレ○ 自販機○ コンビニ○。信号なしでどこまでも走れる。夜は暗いので注意(nightLighting: dark) |
| senbako | 千波湖 | 茨城県/水戸市 | 36.3719, 140.4587 | 3.0km | loop | mixed | 0 | ほぼ0 | waterside, flat, no-signals, scenic | トイレ○ 水飲み場○ 自販機○ 駐車場○。湖畔1周3km、黒鳥と白鳥がいる。偕楽園が隣接 |
| oohori | 大濠公園 | 福岡県/福岡市中央区 | 33.5862, 130.3785 | 2.0km | loop | asphalt | 0 | ほぼ0 | waterside, flat, dedicated-lane, bright-at-night | トイレ○ 水飲み場○ 自販機○。ゴム舗装のジョギングロード。福岡ランナーの聖地 |
| osakajo | 大阪城公園 | 大阪府/大阪市中央区 | 34.6873, 135.5262 | 3.5km | loop | asphalt | 0 | 約20m | park, scenic, cherry-blossoms | トイレ○ 自販機○ ロッカー○(周辺ランステ)。外周1周約3.5km、天守閣を眺めながら走れる |
| meijo | 名城公園 | 愛知県/名古屋市北区 | 35.1900, 136.9019 | 1.3km | loop | asphalt | 0 | ほぼ0 | park, flat, bright-at-night | トイレ○ 水飲み場○。1周1.3kmのランニングコース「トンボリング」。名古屋城北側 |

写真はシードでは登録しない(プレースホルダー表示の確認を兼ねる)。

---

## 12. 実装マイルストーン(この順で実装する)

**M1: 基盤** — Next.js初期化、Tailwind+デザイントークン、Drizzle+スキーマ+Neon接続、シードスクリプト、ヘッダー/フッター。
受け入れ: `pnpm db:push && pnpm db:seed` が通り、`/` にヘッダー付きの空ページが表示される。

**M2: 閲覧** — スポットカード、ホーム(§6.1)、詳細ページ(§6.4、地図含む)。
受け入れ: シードの8スポットがホームに並び、詳細ページで地図上にルート線とスペックが表示される。

**M3: 検索** — `/spots` のフィルター・並び替え・ページネーション・地図表示。
受け入れ: `?pref=東京都&tags=no-signals,flat` で正しくAND絞り込みされ、URL直叩きでも同じ結果になる。0件時の表示も確認。

**M4: 管理** — 簡易認証(middleware)、GPX解析API+lib(テスト付き)、登録/編集/削除フォーム。
受け入れ: ログイン → GPXアップロード → 自動入力値の確認 → 保存 → 公開ページに反映、の一連が動く。未ログインで `/admin` に入れない。vitestが通る。

**M5: 仕上げ** — `/about`、SEOメタデータ、OGP、レスポンシブ最終確認、empty/loading状態、README(セットアップ手順・実装メモ)。

---

## 13. 完成の定義(Definition of Done)

- [ ] `pnpm install && pnpm db:push && pnpm db:seed && pnpm dev` の手順だけでローカル起動できる(READMEに記載)
- [ ] `pnpm build` と `pnpm lint` がエラーなしで通る
- [ ] `pnpm test` (vitest, gpx.tsのテスト)が通る
- [ ] シード8スポットで、ホーム/検索/詳細の全画面が表示崩れなく動く(モバイル幅375pxとPC幅1280pxの両方)
- [ ] 検索: 都道府県・タグAND・形状・距離レンジ・設備・キーワード・並び替え・ページネーションがすべて機能する
- [ ] 詳細: ルート線付き地図、大数字スペック表示、設備グリッド、近くのスポット、が仕様通り
- [ ] 管理: ログインガード、GPXアップロードからの自動入力、登録/編集/削除が機能する
- [ ] geojsonがnullのスポット(手入力登録)でも全画面がエラーにならない
- [ ] 各ページに適切な `<title>` とmeta descriptionが設定されている
- [ ] Vercelにデプロイ可能な構成である(環境変数は `.env.example` に列挙)

---

## 付録A: フェーズ2の概要(今回実装しない・参考)

- 認証: Clerk(Vercel Marketplace)を導入。users テーブルと連携。
- ハシリタイ: 詳細ページのボタンを実動化。マイページに一覧。スポットの人気順ソートに利用。
- 走リ活: 詳細ページから投稿(日付・距離・タイム・コメント・写真)。新着走リ活フィードをホームに追加。
- 将来のStrava連携: OAuth + アクティビティのGPX取り込みで走リ活を半自動化。
