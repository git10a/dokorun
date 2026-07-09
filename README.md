# どこラン (dokorun)

「週末、どこ走る？」に答える、日本全国のランニングスポットのデータベースです。公開側ではスポットの検索・閲覧、運営側ではGPXを使った登録・編集ができます。

## セットアップ

必要なもの:

- Node.js 20.9以上(22または24を推奨)
- npm

DBはCloudflare D1(SQLite)です。ローカルではminiflareが管理するsqliteファイル(`.wrangler/state/`)を使うため、外部DBの用意は不要です。

```bash
cp .env.example .env.local
npm install
npx wrangler d1 execute dokorun-db --local --file drizzle/0000_init.sql  # ローカルD1にスキーマ作成
npm run db:seed
npm run dev
```

`.env.local` に次を設定してください。

```dotenv
ADMIN_PASSWORD=運営ログイン用のパスワード
SESSION_SECRET=32文字以上のランダム文字列
R2_PUBLIC_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`R2_PUBLIC_URL` は任意です(公開設定したR2バケットのベースURL)。設定時は管理フォームから画像ファイルをR2へアップロードでき、未設定時は画像URLを直接入力します。

## コマンド

```bash
npm run dev       # 開発サーバー
npm run build     # 本番ビルド(next build)
npm run preview   # Workers実行環境(workerd)でローカル確認
npm run deploy    # Cloudflare Workersへデプロイ
npm run lint      # 静的チェック
npm test          # GPX解析の単体テスト
npm run db:generate  # Drizzleスキーマ変更からDDL(SQL)を生成 → wrangler d1 executeで適用
npm run db:seed   # タグ16件・スポット8件を投入
npm run db:import -- data/spots.json [--dry-run]  # スポットの一括インポート
npm run validate:spots -- data/spots.json         # 調査データの品質検証
npm run gpx:check -- data/gpx/kokyo.gpx           # GPXを登録せずに解析結果を表示
npm run gpx:apply -- kokyo data/gpx/kokyo.gpx     # GPXをスポットの代表コースとして登録
```

代表コースのGPX整備は [docs/gpx-course-task.md](docs/gpx-course-task.md) の手順・進捗表を参照してください。GPX原本は `data/gpx/<slug>.gpx` に保存します。

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
- DBはCloudflare D1です。ドライバは実行環境で自動切り替えします(`src/db/index.ts`): Workers本番と`next dev`はD1バインディング、ビルド時プリレンダとCLIスクリプトはローカルsqliteファイル(`@libsql/client`)。本番D1への直接SQL適用は `node scripts/run-sql.mjs <file.sql> --remote`。
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
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run deploy
```

- DBはCloudflare D1(`dokorun-db`)です。スキーマは `npx wrangler d1 execute dokorun-db --remote --file drizzle/0000_init.sql` で適用します。
- deployは本番D1のスナップショットを取ってからビルドします(`scripts/d1-snapshot.mjs`)。ビルド時プリレンダ(トップ/sitemap)の内容が本番KVキャッシュにシードされるため、このガードを外さないでください。
- 画像アップロードを使う場合は `dokorun-images` バケットを公開設定(カスタムドメインまたはr2.dev)にし、そのベースURLを `wrangler.jsonc` の `R2_PUBLIC_URL` に設定します。未設定でもURL直接入力で運用できます。
- `npm run preview` でデプロイ前にWorkers実行環境(workerd)上での動作をローカル確認できます。
