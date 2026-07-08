# ユーザープロフィール機能拡張タスク

対象: Codex（実装担当）。このドキュメントだけで実装できるよう、現状・設計判断・手順をまとめる。

## スコープ（7項目）

0. 【バグ修正】ヘッダーのユーザーアイコンが表示されない問題
1. アバター（アイコン）を自由に変えられる機能
2. SNSリンク（Instagram / Strava / X）の登録とアイコン表示
3. ランナー歴の入力
4. PB（自己ベスト）の入力（種目は 1500m〜100km）
5. GitHubの草風「走った日カレンダー」（黄色）＋ワンタップチェックイン
6. 好きなコース（お気に入り）の登録 — 掲載スポットに紐づく
7. 公開プロフィールページ `/u/[handle]`（2〜6の表示先として新設）

Strava自動連携（OAuth同期）は **Phase 2（本タスク外）**。末尾に設計メモのみ記載。

---

## 前提（現状の構成）

- Next.js 16 App Router + React 19 + Tailwind v4。Cloudflare Workers（OpenNext）+ Neon Postgres。
- 認証: Better Auth（Google）。設定は `src/lib/better-auth.ts`。`session.cookieCache`（5分）が有効な点に注意 — **DBを直接UPDATEしてもセッションcookie内のユーザー情報は最大5分古いまま**。ヘッダー表示に関わる値（image等）の更新は Better Auth の updateUser 経由にすること。
- ユーザースキーマ: `src/db/schema.ts:84-94`（users）。`handle`（unique）と `bio` は additionalFields として定義済み（`src/lib/better-auth.ts:58-66`）。
- プロフィール編集: `src/app/me/page.tsx` → `src/components/auth/profile-form.tsx` → Server Action `src/app/me/actions.ts` の `updateProfile`（zod検証 + drizzle直接UPDATE）。
- マイグレーションは **`npm run db:push`（drizzle-kit push）** 運用。マイグレーションファイルなし。本番は `DATABASE_URL` を本番Neonに上書きして push（`docs/auth-and-posts-task.md` 参照）。今回の変更は全て加算的（カラム追加・テーブル追加）なので push で安全。
- **R2は未有効**（`wrangler.jsonc` でコメントアウト）。よって画像アップロードは不可。アバターはプリセット方式にする（後述）。
- **バンドルサイズ制約**: Workers無料プラン 3MiB gzip、残り約139KiB。**新しいnpm依存は追加しない**こと（SNSアイコンはインラインSVG、草カレンダーは素のCSS gridで実装）。
- Workers CPU 10ms制約: 重い集計はSQL側で行い、レンダリングは軽く保つ。

---

## 0. ヘッダーアイコンのバグ修正（最優先・確実なバグ）

**原因**: `src/components/auth/user-menu.tsx:32` で `next/image` の `<Image>` に Googleの外部URL（`lh3.googleusercontent.com`）を渡しているが、`next.config.ts` に `images.remotePatterns` が未設定。next/image は未許可ホストで実行時エラーになり画像が出ない。さらに OpenNext Cloudflare では画像最適化サービス自体を設定していない。

**修正**: `next/image` をやめ、素の `<img>` にする（`src/app/spots/[slug]/page.tsx:79` のドコログ表示と同じパターン）。

```tsx
// user-menu.tsx:32 置き換え
{session.user.image
  ? <img src={session.user.image} alt="" width={36} height={36} className="size-9 object-cover" referrerPolicy="no-referrer" />
  : <UserRound size={18} />}
```

`import Image from "next/image"` を削除。ESLintの `@next/next/no-img-element` が出たら該当行のみ disable コメントで抑制（外部アバターURLに最適化は不要）。

---

## 1. スキーマ変更（全機能分を一括で）

`src/db/schema.ts` に以下を追加。**カラム追加＋新テーブル3つ。既存カラムの変更はしない。**

```ts
// users に追加するカラム
avatarKey: text("avatar_key"),            // プリセットアバターID。null = Google画像(image)を使う
instagram: text("instagram"),             // ユーザー名のみ格納（@やURLは正規化で除去）
xHandle: text("x_handle"),                // ユーザー名のみ格納
strava: text("strava"),                   // strava.com/athletes/ 以降のIDまたはvanity名
runningSinceYear: integer("running_since_year"), // 走り始めた年（西暦）
```

```ts
// PB。種目ごとに1レコード
export const userPbs = pgTable("user_pbs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(),        // 下記 PB_EVENTS のキー
  timeS: integer("time_s").notNull(),    // 秒
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("user_pbs_user_event_unique").on(t.userId, t.event)]);

// 好きなコース（お気に入り）。ハシリタイ(走りたい)とは別概念・ログイン必須
export const favoriteSpots = pgTable("favorite_spots", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spotId: uuid("spot_id").notNull().references(() => spots.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("favorite_spots_pk").on(t.userId, t.spotId),
  index("favorite_spots_spot_idx").on(t.spotId),
]);

// 走った日（草カレンダーの元データ）。ドコログより軽いワンタップチェックイン用
export const runDays = pgTable("run_days", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),            // JSTの日付
  source: text("source").notNull().default("checkin"), // "checkin" | 将来 "strava"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("run_days_pk").on(t.userId, t.day)]);
```

- `date` を drizzle の import に追加（`drizzle-orm/pg-core` の `date`）。
- Better Auth の additionalFields（`src/lib/better-auth.ts:58-66`）に追記:
  - `avatarKey: { type: "string", input: false, required: false }` — セッションに載せる（ヘッダーで使うため）。
  - instagram / xHandle / strava / runningSinceYear は additionalFields に**入れない**（セッションに不要。DBから読めば足りる。cookieが太るのを避ける）。
- 適用: `npm run db:push`（ローカル/開発Neon）。本番反映はデプロイ時に `DATABASE_URL=<本番> npm run db:push`。

---

## 2. アバター変更機能（プリセット方式)

R2が使えないため画像アップロードはせず、**同梱SVGのプリセットから選ぶ**方式にする。

### アセット
- `public/avatars/` に **12種程度のSVG** を新規作成。ランニングテーマ（走る人・シューズ・山・トラック・河川敷など）×ブランドカラー系の配色（brand `#ffd900` を基調に背景色違い）。ファイル名 = avatarKey（例 `runner-01.svg` … key は `runner-01`）。
- 一覧の定義: `src/lib/avatars.ts` を新規作成。

```ts
export const AVATAR_KEYS = ["runner-01", "runner-02", /* … */] as const;
export function avatarUrl(user: { avatarKey?: string | null; image?: string | null }): string | null {
  if (user.avatarKey && (AVATAR_KEYS as readonly string[]).includes(user.avatarKey)) return `/avatars/${user.avatarKey}.svg`;
  return user.image ?? null;
}
```

### 更新経路（重要）
ヘッダーは `authClient.useSession()` のcookieキャッシュを見るので、**クライアントから `authClient.updateUser({ avatarKey })` で更新する**（Better Auth がセッション/cookieキャッシュを更新してくれるので即時反映される）。そのために additionalFields の `avatarKey` は `input: true` にする。

- サーバー側ガード: `src/lib/better-auth.ts` の `databaseHooks.user.update.before` を追加し、`avatarKey` が `AVATAR_KEYS` に含まれるか `null` 以外なら弾く（クライアント入力を許すのでホワイトリスト必須）。
- `null`（未設定）に戻すと Google の画像（`users.image`）に戻る。`users.image` は**上書きしない**こと。

### UI
- `src/components/auth/avatar-picker.tsx`（client）: 現在のアバター＋グリッドでプリセット一覧＋「Googleの画像に戻す」。選択で `authClient.updateUser({ avatarKey })` → 成功トースト。`/me` のプロフィールセクション上部に配置。
- 表示側の差し替え: `user-menu.tsx`（`avatarUrl(session.user)`）、`src/app/spots/[slug]/page.tsx` のドコログアバター（`getPublicRuns` が返す userImage を avatarKey 考慮に変更 — `src/db/data.ts` のクエリに `users.avatarKey` を足し、表示側で `avatarUrl` を通す）。

---

## 3. SNSリンク + ランナー歴（プロフィールフォーム拡張）

### 正規化・検証（`src/lib/social.ts` 新規 + vitestユニットテスト追加）
入力はURL・@付き・生ユーザー名のどれでも受け付け、**ユーザー名に正規化して保存**する。

- Instagram: `instagram.com/<name>` または `@name` / `name` → `name`。許容: `/^[a-zA-Z0-9._]{1,30}$/`
- X: `x.com/<name>`・`twitter.com/<name>`・`@name` → `name`。許容: `/^[A-Za-z0-9_]{1,15}$/`
- Strava: `strava.com/athletes/<id-or-vanity>` またはそのまま → `<id-or-vanity>`。許容: `/^[a-zA-Z0-9_-]{1,64}$/`
- リンク生成: `https://www.instagram.com/${v}` / `https://x.com/${v}` / `https://www.strava.com/athletes/${v}`

### Server Action
`src/app/me/actions.ts` の `updateProfile` を拡張（zodスキーマに instagram / xHandle / strava / runningSinceYear を追加。空文字は null）。ランナー歴は「走り始めた年」を `<select>`（1950〜今年）で入力し、表示時に `今年 - runningSinceYear + 1` 年目と計算する。これらはセッションに載せないのでdrizzle直接UPDATEのままでよい。

### フォーム
`src/components/auth/profile-form.tsx` に4項目追加。SNSは placeholder に「ユーザー名またはURL」。

### アイコン表示コンポーネント
`src/components/social-links.tsx`（server component可）: 登録があるSNSだけブランドアイコンを丸ボタンで並べ、`target="_blank" rel="noopener noreferrer"` で外部リンク。**アイコンは lucide にブランドアイコンが無い（Instagram はあるが X / Strava は無い）ため、3つとも [simple-icons](https://simpleicons.org/) のpathデータを使ったインラインSVGで統一**（依存追加はしない。24x24 viewBox の path をコンポーネント内に直書き）。

---

## 4. PB（自己ベスト）入力

### 種目定義（`src/lib/pb.ts` 新規）
```ts
export const PB_EVENTS = [
  { key: "1500m",  label: "1500m" },
  { key: "3000m",  label: "3000m" },
  { key: "5k",     label: "5km" },
  { key: "10k",    label: "10km" },
  { key: "half",   label: "ハーフマラソン" },
  { key: "30k",    label: "30km" },
  { key: "full",   label: "フルマラソン" },
  { key: "100k",   label: "100km（ウルトラ）" },
] as const;
```
- 秒⇔ `h:mm:ss` の変換ヘルパーと、種目ごとの妥当性レンジ（例: 1500mは2分〜、100kmは6時間〜48時間など緩めの下限上限）もここに置く。ペース表示ヘルパー（/kmペース併記）もあると良い。

### UI / Action
- `/me` のプロフィールの下に「自己ベスト」セクション。種目ごとに `時 / 分 / 秒` の3つの number input（1500m〜10kは時を省略可）。空欄 = 未登録。
- Server Action `updatePbs`（`src/app/me/actions.ts` に追加）: 入力された種目を upsert（`onConflictDoUpdate` on `(userId, event)`）、空にされた種目は delete。zodでレンジ検証。
- 表示: 公開プロフィール（後述）に登録済み種目のみテーブル表示（タイム + /kmペース）。

---

## 5. 草カレンダー（走った日ヒートマップ）＋ワンタップチェックイン

### データ設計
草の元データは **`run_days` ∪ ドコログ（runs.ranAt のJST日付）** の和集合。ドコログを書けば自動で草が生え、書かない日は「今日走った」ボタン1タップで生える。

集計クエリ（`src/db/data.ts` に追加）:
```sql
select day, max(cnt) from (
  select (ran_at at time zone 'Asia/Tokyo')::date as day, count(*) as cnt
    from runs where user_id = $1 and ran_at > now() - interval '400 days' group by 1
  union all
  select day, 1 from run_days where user_id = $1 and day > (now() at time zone 'Asia/Tokyo')::date - 400
) t group by day;
```

### チェックインAPI
- Server Action `checkinToday`（`src/app/me/actions.ts`）: `requireUser` → JSTの今日を `jstDayBounds`（`src/app/me/logs/actions.ts` に既存のJST処理がある。共通化して `src/lib/jst.ts` に切り出すと良い）で求め、`run_days` に `onConflictDoNothing` でinsert。取り消し（同日delete）も用意。
- 対象日は**今日と昨日のみ許可**（過去の改変はドコログでやってもらう。UIがシンプルになる）。

### 草コンポーネント
- `src/components/run-grass.tsx`（server component）: 直近53週×7日のCSS grid。**ライブラリ不使用**。各セルは `<div>`（約10px角、`rounded-[2px]`）。走った日は brand黄 `#ffd900`、未走は `bg-cream`。濃淡はまず2値でよい（将来ドコログ件数や距離で4段階に）。月ラベルを上に、曜日ラベル（月・水・金）を左に。スマホでは直近26週に減らして横スクロール無しで収める（`hidden sm:block` で出し分け、または `overflow-x-auto`）。
- 配置: `/me`（チェックインボタン付き）と公開プロフィール。
- title属性で `2026-07-08: ドコログ1件` のようなツールチップ。

### 継続利用の仕掛け（今回入れる範囲）
- `/me` とヘッダーメニュー内に「🏃 今日走った」ボタン（1タップ・押すと即草が生える楽観更新）。
- ドコログ投稿時は自動で草が生える（runs由来なので追加実装不要）。
- 連続日数（ストリーク）と直近30日の走った日数を草の横に表示（集計結果から計算するだけ）。

> 自動化の本命は Strava 連携（Phase 2、末尾）。

---

## 6. 好きなコース（お気に入り）

- 概念整理: **ハシリタイ = 走ってみたい（匿名可）**、**お気に入り = 走って好きだった（ログイン必須）**。既存の hashiritai テーブルは触らない。
- Server Action `toggleFavorite(spotId, on)`（`src/app/me/actions.ts` か spot側のactionsに追加）: `requireUser` → `favorite_spots` に insert `onConflictDoNothing` / delete。
- UI: `src/components/favorite-button.tsx`（client、`hashiritai-button.tsx` を参考に楽観更新。未ログイン時は `/login?callbackURL=<現在のスポット>` へ誘導）。スポット詳細 `src/app/spots/[slug]/page.tsx` のハシリタイボタンの隣に星アイコン（lucide `Star`）で配置。アイコンの意味が被らないよう、ハシリタイ=ハート、お気に入り=星。
- 一覧: `/me/favorites` ページ（`/me/hashiritai` の実装を流用）。`/me` のカードグリッドに「お気に入りコース」リンクを追加。
- クエリ: `src/db/data.ts` に `getUserFavorites` / `isFavoriteForUser` / `getFavoriteSpotsByUser`（公開プロフィール用、spots join、`isPublished` のみ）。

---

## 7. 公開プロフィールページ `/u/[handle]`

2〜6の成果の「見せ場」。`src/app/u/[handle]/page.tsx` を新設（server component、`dynamic = "force-dynamic"`）。

- `handle` で users を引く。いなければ `notFound()`。
- 表示: アバター（`avatarUrl`）/ 表示名 / bio / SNSアイコン（social-links）/ ランナー歴 / PBテーブル / 草カレンダー / 好きなコース（スポットカード）/ 公開ドコログ最新10件（`visibility = 'public'` のみ。private は絶対に出さない）。
- **email は絶対に表示しない**。
- 導線: `/me` に「公開プロフィールを見る」リンク。スポット詳細のドコログのユーザー名（`src/app/spots/[slug]/page.tsx:79` 付近）を `/u/[handle]` へのリンクに変更（クエリに users.handle を追加）。
- メタ: `generateMetadata` でタイトル「◯◯さんのプロフィール | ドコラン」。`robots: { index: false }` を初期値にする（本人が知らないうちに検索に載るのを避ける。開放は将来判断）。

---

## 実装順（コミット単位の目安)

1. ヘッダーアイコン修正（§0）— 単独コミット、即デプロイ可
2. スキーマ追加 + db:push + additionalFields（§1）
3. アバター機能（§2）
4. プロフィールフォーム拡張: SNS + ランナー歴 + social.ts + テスト（§3）
5. PB（§4）
6. お気に入り（§6）
7. 草カレンダー + チェックイン（§5）
8. 公開プロフィール `/u/[handle]` + 各所の導線（§7）

各ステップ後に `npm run lint && npm run test`。動作確認は `npm run dev`（※pnpm不可、npm使用）。

## 注意事項（再掲・重要)

- **依存パッケージを追加しない**（サイズ上限）。アイコンはインラインSVG、日付処理は素のDate + 既存JSTヘルパー。
- **`users.image` を上書きしない**。アバターは `avatarKey` で管理し `avatarUrl()` で解決。
- **avatarKey は client input を許すのでサーバー側ホワイトリスト検証必須**（databaseHooks.user.update.before）。
- セッションcookieキャッシュ（5分）: ヘッダー表示に影響する更新は `authClient.updateUser` 経由。それ以外はdrizzle直接UPDATEでよい。
- SNSリンク出力時は必ず正規化済みユーザー名からURLを組み立てる（ユーザー入力の生URLをhrefに入れない — javascript: 等の注入防止）。
- 本番push忘れに注意: デプロイ前に `DATABASE_URL=<本番Neon> npm run db:push`。
- 他エージェントが並行で編集している可能性あり。作業前に `git pull`、コンフリクトしやすい `schema.ts` / `actions.ts` は早めにコミット。

---

## Phase 2 メモ: Strava自動連携（今回はやらない）

草の継続利用の本命。設計だけ残す:
- Strava OAuth（scope: `activity:read`）。`accounts` とは別に `strava_connections` テーブル（userId, athleteId, accessToken, refreshToken, expiresAt）。
- 同期は Strava Webhook（activity create イベント）→ `/api/strava/webhook` で `run_days` に `source: "strava"` でinsert。フォールバックとして Workers cron（`wrangler.jsonc` の `triggers.crons`）で日次同期。
- 制約: Strava APIはアプリ承認前 athlete 1人（自分）のみ→ 公開には申請必要。rate limit 100req/15min。表示ガイドライン（Powered by Strava表記）。
- ユーザー体験: 設定画面で「Stravaと連携」→ 以後は走れば勝手に草が生える。ドコログとは独立（草のみ自動化）。
