# 会員登録・走りたいスポット登録・走った投稿（ドコログ）実装計画

作成日: 2026-07-08 / 実装担当: Codex

## 0. 認証基盤の選定結果

### 結論: Better Auth（自前ホスト・Neon同居）を採用する

Firebase / Supabase / Better Auth を現構成（Next.js 16 App Router + OpenNext + Cloudflare Workers + Neon Postgres + Drizzle）に照らして比較した。

| 観点 | Firebase Auth | Supabase Auth | Better Auth |
|---|---|---|---|
| DBとの関係 | 認証データがGCP側に分離。Neonへのユーザー同期テーブルが別途必要 | 認証データがSupabase側のPostgresに分離。Neonと二重管理になる | ユーザー/セッションを既存Neonのテーブルとして持てる（Drizzleアダプタ） |
| Workersランタイム | firebase-admin SDKがWorkersで動かず、JWKSによる手動JWT検証が必要 | @supabase/ssr は動くが、DB統合の旨味（RLS等）がNeon利用では消える | Web Crypto ベースで Workers 対応。既存の管理者認証（crypto.subtle）と同じ土俵 |
| ベンダー追加 | GCPが増える | Supabaseが増える | 増えない（npmパッケージのみ） |
| 費用 | 無料枠大 | 無料枠 50k MAU | 無料・MAU制限なし |
| 実装量 | 中（トークン検証の自前実装） | 中 | 中（スキーマ生成CLIあり） |

- Supabase の価値は「DB+Auth+Storage の統合」にあるが、DBは既に Neon で本番稼働・GPX投入パイプラインも Neon 前提。Auth だけ切り出して使うと Postgres が2つになり分が悪い。Neon→Supabase の全面移行は得るものに対して工数過大。
- Firebase Auth は成立するが、Workers 上で firebase-admin が動かないため ID トークン検証を自前で書く必要があり、結局 Neon 側に users 同期も要る。純 Cloudflare+Neon 構成に GCP を足す必然性が薄い。
- Better Auth ならユーザーデータが既存DBに同居し、`runs.userId` などの外部キーが素直に張れる。Google ログイン標準対応、将来の LINE ログインも genericOAuth プラグインで可能。

どうしても managed サービスにしたい場合の次点は Firebase Auth（その場合も本計画の Phase 2 以降はそのまま使える。Phase 1 の認証層だけ差し替え）。

### 認証方式

- **初期リリース: Google ログインのみ**（メール配信基盤が不要で最小コスト。ランナー層のGoogleアカウント保有率は高い）
- メール+パスワードは後続（Resend 等のメール送信が必要になるため Phase 4）
- LINE ログインも Phase 4 候補（日本のC向けでは効果大）

---

## 実装上の前提・制約（必読）

- DB接続は [src/db/index.ts](../src/db/index.ts) の3ドライバ切替を必ず経由する。**Workers上は neon-http でトランザクション不可**。トランザクションが要る書き込みは既存の `withTxDb()` パターンに従う。Better Auth のDB操作がトランザクションを要求しないことを初期に検証すること（Drizzleアダプタ + neon-http は一般的な組み合わせだが、動作確認を Phase 1 の完了条件に含める）。
- ミドルウェアは edge ランタイムの [src/middleware.ts](../src/middleware.ts)。ここでは**DBアクセスせず** cookie の存在チェックのみ（Better Auth の `getSessionCookie`）。本検証は各ページ/Server Action 側で行う。
- 既存の管理者認証（`src/lib/auth.ts`、cookie `dokorun_admin`）は**そのまま残し、別系統として共存**させる。ファイル名衝突を避けるため Better Auth 側は `src/lib/auth/` ディレクトリか `src/lib/better-auth.ts` に置く。
- マイグレーションは `drizzle-kit push` 運用（マイグレーションファイルなし）。本番反映は `DATABASE_URL` を本番Neonに上書きして push。**破壊的変更になっていないか push 前に必ず差分確認**。
- 既存コードのパターンを踏襲: Server Action は `FormData` + Zod `safeParse` + `FormState` 返却 + `revalidatePath`、API Route は `NextResponse.json` + Zod。
- 環境変数は3箇所同期: `.dev.vars`（wrangler/preview）、`.env.local`（next dev）、本番は `wrangler secret put`。`.env.example` も更新する。
- R2 は未有効化（wrangler.jsonc でコメントアウト中）。**写真アップロードは本計画のスコープ外**（Phase 4）。

---

## Phase 1: 認証基盤（Better Auth）

### 1-1. セットアップ

- `npm i better-auth`（pnpm は使わない。この環境では npm 固定）
- 環境変数追加: `BETTER_AUTH_SECRET`（32文字以上）、`BETTER_AUTH_URL`（本番 `https://dokorun.com`）、`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - Google OAuth クライアントは GCP Console で作成（リダイレクトURI: `https://dokorun.com/api/auth/callback/google` とローカル用 `http://localhost:3000/api/auth/callback/google`）。これはユーザー（人間）の作業なので、必要になった時点で明示的に依頼すること。

### 1-2. スキーマ

既存 `users` テーブル（[src/db/schema.ts:81](../src/db/schema.ts)）は**未使用の骨組み**（handle / displayName / avatarUrl のみ）。本番にデータが無いことを `select count(*)` で確認の上、Better Auth 要求スキーマに合わせて再定義する:

- `users`: Better Auth 標準（`id`, `name`, `email` unique, `emailVerified`, `image`, `createdAt`, `updatedAt`）+ 追加フィールド `handle`（unique・公開URL用）、`bio`（任意）
  - `handle` はサインアップ時にメールローカル部から自動生成（衝突時はサフィックス付与）、後からプロフィール編集で変更可
- `sessions`, `accounts`, `verifications`: Better Auth 標準スキーマ（`npx @better-auth/cli generate` の出力を Drizzle スキーマに統合）
- `runs.userId` の FK は users 再定義後も維持

### 1-3. サーバー/クライアント実装

- `src/lib/better-auth.ts`: `betterAuth({ database: drizzleAdapter(...), socialProviders: { google }, user: { additionalFields: { handle, bio } } })`
  - DBインスタンスは既存 `getDb()` を利用
- `src/app/api/auth/[...all]/route.ts`: ハンドラをマウント
- `src/lib/auth-client.ts`: `createAuthClient()`（クライアントコンポーネント用）
- `src/middleware.ts` に会員向け保護パス（`/me/:path*`）を追加。cookie 存在チェックのみ
- サーバー側のセッション取得ヘルパ `getUser()` / `requireUser()` を作り、以降の Server Action で先頭呼び出しする（既存 `requireAdmin()` と同じ流儀）

### 1-4. UI

- `/login` ページ: 「Googleでログイン」ボタン + サービス説明。ログイン後は元いたページへ戻す（`callbackURL`）
- ヘッダー: 未ログイン時「ログイン」リンク、ログイン時アバター+ドロップダウン（マイページ / ログアウト）
- `/me` マイページ骨組み: プロフィール表示・編集（displayName=name, handle, bio）
- 利用規約・プライバシーポリシーページが無ければ最低限の文面で `/terms` `/privacy` を用意し、ログイン画面から導線を張る（UGC開始前に必要）

### 完了条件

- ローカル（`next dev`）と `npm run preview`（Workersランタイム）の両方で Google ログイン→セッション維持→ログアウトが動く
- Workers ランタイムでの Better Auth DB操作にトランザクション起因のエラーが出ないことを確認
- 既存の管理者ログイン（/admin）が壊れていない

---

## Phase 2: 走りたいスポット登録（ハシリタイのログイン対応）

現状の `hashiritai` は localStorage の匿名 `clientId` ベース（[src/db/schema.ts:101](../src/db/schema.ts)）。これを会員機能に接続する。

### 2-1. スキーマ変更

- `hashiritai` に `userId`（nullable, FK users.id, onDelete cascade）を追加
- unique 制約: 既存 `(clientId, spotId)` に加え、部分 unique index `(userId, spotId) where user_id is not null`
  - `drizzle-kit push` で部分インデックスが表現しづらい場合は `scripts/sql/` に追加SQL を置く既存運用に従う

### 2-2. マージ処理

- ログイン直後にクライアントが `POST /api/hashiritai/merge` に `clientId` を送信 → その clientId の行に userId を紐付け（既に同 user×spot があれば削除）。以降そのブラウザでは userId 優先で記録
- 未ログイン時は従来どおり clientId で動作（機能を後退させない）

### 2-3. UI

- `/me/hashiritai`: 自分の走りたいスポット一覧（スポットカード再利用、解除ボタン付き）
- スポット詳細のハシリタイボタン: ログイン時は userId で登録し、ボタン状態をサーバー値から復元（複数端末で同期される、が売り）

### 完了条件

- 匿名→ログインでハシリタイが引き継がれる。ログアウト状態の既存動作が変わらない

---

## Phase 3: 走った投稿（ドコログ）

記録名は「ドコログ」（サービス内呼称。UI文言は「走った記録」併記で分かりやすく）。

### 3-1. スキーマ変更

既存 `runs` テーブルを拡張（未使用確認の上）:

- 追加: `courseId`（nullable, FK courses.id, onDelete set null）、`visibility`（enum `run_visibility`: `public` | `private`, default `public`）
- インデックス追加: `runs_user_idx (user_id)`, `runs_ran_at_idx (ran_at desc)`
- 既存カラム維持: `ranAt`, `distanceM`, `durationS`, `comment`
- 写真は Phase 4（R2 有効化待ち）なのでカラムを先に作らない

### 3-2. 投稿フロー

- スポット詳細ページに「走った記録を投稿」ボタン（要ログイン。未ログインなら /login へ、callbackURL で戻す）
- 投稿フォーム（モーダルまたは `/spots/[slug]/log/new`）: 走った日（default 今日）、コース選択（そのスポットのコース or 指定なし）、距離（km入力→m保存）、時間（任意）、ひとことコメント（任意・500字上限）、公開/非公開
- Server Action で実装。Zod 検証 + `requireUser()` + `revalidatePath`。既存 `contact/actions.ts` のパターン踏襲
- **スパム対策**: 1ユーザー1日20件上限（サーバー側カウント）。コメントは簡易NGワードフィルタ + 管理画面から削除可能に（3-4）

### 3-3. 表示

- スポット詳細: 「みんなのドコログ」セクション（public のみ、新しい順、まず10件 + もっと見る）。表示項目: アバター/名前、走った日、コース名、距離、ペース（distance/duration から算出、両方ある時のみ）、コメント
- `/me/logs`: 自分の記録一覧（private 含む）。編集・削除可
- 投稿の編集/削除は本人のみ（Server Action 内で userId 一致チェック。**id だけで更新しない**）

### 3-4. 管理

- `/admin` に UGC 管理ビュー: 最新のドコログ一覧 + 削除ボタン（`requireAdmin()`）

### 完了条件

- 投稿→スポットページ反映→編集→削除の一連が Workers ランタイムで動く
- 他人の投稿を URL 直叩き・Action 直呼びで改変できないこと（認可チェックのテストを `tests/` に追加）

---

## Phase 4: 後続候補（本計画のスコープ外）

1. **写真付き投稿**: R2 有効化（ユーザー作業: Cloudflare ダッシュボードで R2 契約 → wrangler.jsonc の `IMAGE_BUCKET` コメント解除）後に。既存 `/api/upload` の管理者向けアップロードを一般化 + 画像検閲方針の検討
2. **メール+パスワード認証**: Resend 等の導入とセット
3. **LINE ログイン**: Better Auth genericOAuth プラグイン
4. **公開プロフィール** `/u/[handle]`: 公開ドコログとハシリタイ一覧
5. **Strava 連携**: アクティビティからドコログ自動作成

## 実装順序と検証

Phase 1 → 2 → 3 の順に、**各 Phase ごとにデプロイして本番検証**してから次へ進む（一括ビッグバンにしない）。各 Phase で:

1. ローカル `next dev` で動作確認
2. `npm run preview`（Workersランタイム）で動作確認 ← neon-http / edge 制約はここでしか踏めない
3. `npm test` + `npm run lint`
4. スキーマ変更は dev DB で push → 動作確認 → 本番 DATABASE_URL で push
5. デプロイは手動 `npm run deploy`（node@23 必須）
