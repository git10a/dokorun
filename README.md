# ドコラン (dokorun)

「今日、どこ走る？」に答える、日本全国のランニングスポットのデータベースです。公開側ではスポットの検索・閲覧、運営側ではGPXを使った登録・編集ができます。

## セットアップ

必要なもの:

- Node.js 20.9以上
- pnpm 11
- Neon PostgresなどのPostgreSQLデータベース

Node.js 22または24を推奨します。このMacのNode.js 20.20環境では、Corepack経由のpnpm 11がクラッシュする場合があります。その場合は下記のnpm手順を使用してください。

```bash
cp .env.example .env.local
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

pnpmが起動しない場合:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

`.env.local` に次を設定してください。

```dotenv
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=運営ログイン用のパスワード
SESSION_SECRET=32文字以上のランダム文字列
R2_PUBLIC_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`R2_PUBLIC_URL` は任意です(公開設定したR2バケットのベースURL)。設定時は管理フォームから画像ファイルをR2へアップロードでき、未設定時は画像URLを直接入力します。

## コマンド

```bash
pnpm dev       # 開発サーバー
pnpm build     # 本番ビルド
npm run preview   # Workers実行環境(workerd)でローカル確認
npm run deploy    # Cloudflare Workersへデプロイ
pnpm lint      # 静的チェック
pnpm test      # GPX解析の単体テスト
pnpm db:push   # DrizzleスキーマをDBへ反映
pnpm db:seed   # タグ16件・スポット8件を投入
pnpm db:import -- data/spots.json [--dry-run]  # スポットの一括インポート
npm run validate:spots -- data/spots.json      # 調査データの品質検証
```

各コマンドは `npm run dev`、`npm run build`、`npm run lint`、`npm test`、`npm run db:push`、`npm run db:seed`、`npm run db:import` でも実行できます。

## スポットの一括インポート

外部調査(ChatGPT Deep Researchなど)で集めたスポットデータをJSONで一括登録できます。

1. [docs/research-prompt.md](docs/research-prompt.md) のプロンプトをChatGPTに貼り、JSONを生成させる
2. 出力を `data/xxx.json` に保存する
3. `npm run db:import -- data/xxx.json --dry-run` で検証する(DBには書き込まない)
4. 問題なければ `--dry-run` を外して投入する

登録済みのslugはスキップされるため、繰り返し実行しても安全です(管理画面での編集を上書きしません)。ルート形状(GPX)はインポートに含まれないため、投入後に各スポットの編集画面からGPXをアップロードしてください。

`validate:spots` は座標・タグ・距離・文章量・slug形式を検査し、同じ `data/` ディレクトリ内にあるJSON間のslug重複も情報として表示します。複数ファイルを一度に渡すこともできます。

## 運営画面

`/admin/login` から `ADMIN_PASSWORD` でログインします。セッションは `SESSION_SECRET` でHMAC署名し、httpOnly Cookieへ7日間保存します。スポット登録ではGPX（最大10MB）を解析し、距離・獲得標高・形状・スタート地点・GeoJSONを自動入力できます。

## 実装メモ

- 認証ガードは `src/middleware.ts`(edgeランタイム)で実装しています。Next.js 16の後継である `proxy.ts` はNode.jsランタイム固定で、Cloudflare(@opennextjs/cloudflare)が未対応のためです。
- DBドライバは接続先で自動切り替えします。Neon(`*.neon.tech`)はWebSocketドライバ(`@neondatabase/serverless`)、ローカルPostgresなどは `postgres-js` を使います(`src/db/index.ts`)。
- 公開ページはDBの更新を即時反映するため動的レンダリングです。
- タグ複数指定は、指定した全タグを持つスポットだけを返すAND検索です。
- 写真URLのフォールバック入力は1行1URLの複数入力とし、先頭をメイン写真として扱います。
- GPXがない場合は緯度・経度とコーススペックを手入力できます。GeoJSONが空でも公開画面は代表点のピンを表示します。
- OpenFreeMap Libertyを使用し、MapLibre標準のOpenStreetMap attributionを表示します。

## Cloudflareへのデプロイ

`@opennextjs/cloudflare` でCloudflare Workersへデプロイします。設定は [wrangler.jsonc](wrangler.jsonc) にあります。

```bash
npx wrangler login
npx wrangler r2 bucket create dokorun-images   # 画像アップロード用（任意）
npx wrangler secret put DATABASE_URL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run deploy
```

- DBはNeonなどの外部Postgresをそのまま使います。初回デプロイ前に `npm run db:push` と `npm run db:seed` を実行してください。
- 画像アップロードを使う場合は `dokorun-images` バケットを公開設定(カスタムドメインまたはr2.dev)にし、そのベースURLを `wrangler.jsonc` の `R2_PUBLIC_URL` に設定します。未設定でもURL直接入力で運用できます。
- `npm run preview` でデプロイ前にWorkers実行環境(workerd)上での動作をローカル確認できます。
