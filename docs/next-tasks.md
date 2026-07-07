# ドコラン 次のタスクリスト (2026-07-07)

実装エージェント向けの指示書。優先度順。DESIGN.md・READMEの規約に従うこと。
pnpmがクラッシュする環境のため、コマンドはすべて `npm run ...` を使う。

## 現状サマリ

- アプリ本体はDESIGN.mdのM1〜M5まで実装済み
- `data/` に調査済みスポット4ファイル・計150件(ユニークslug 110件。重複40件はimport時にスキップされる)
- 全スポットに lat/lng・course スペックあり。**photoUrls・GPXは全件なし**
- sitemap.xml / robots.txt 未実装
- gitリポジトリ未初期化(Vercel接続の前提)

---

## P0: データ投入と110件での表示検証

1. 4ファイルを順にdry-runで検証:
   ```bash
   npm run db:import -- data/running-spots-2026-07-07.json --dry-run
   npm run db:import -- data/running-spots-tokyo-kinko-2026-07-07.json --dry-run
   npm run db:import -- data/running-spots-kanto-2026-07-07.json --dry-run
   npm run db:import -- data/running-spots-regional-2026-07-07.json --dry-run
   ```
2. エラーがなければ `--dry-run` を外して投入(登録済みslugはスキップされるので順不同・再実行可)
3. 投入後の確認項目:
   - `/spots` のページネーションが110件超で正しく動く(件数表示・最終ページ)
   - 都道府県フィルタ: スポット多数(東京40件)と1件のみ(例: 鳥取県)の両方
   - 地図表示 `/spots?view=map` が110ピンでも実用的な速度で描画される
   - 詳細ページ: geojsonなしスポットで代表点ピン表示・エラーなし

## P1: データ品質検証スクリプト

AI調査で生成したデータなので機械検証を入れる。`scripts/validate-spots.ts` を新規作成し、`npm run validate:spots -- data/xxx.json` で実行できるようにする。

チェック項目:
- lat/lng が日本国内の範囲か、および都道府県の大まかなバウンディングボックス内か(`src/lib/prefectures.ts` に境界データを追加)
- tags がシードのタグマスタ16件のslugに全部含まれるか
- course.distanceM が 200m〜100km の妥当レンジか
- description / access の文字数(空・極端に短いものを警告)
- slug形式(小文字英数とハイフンのみ)
- ファイル間・ファイル内のslug重複を一覧表示(エラーではなく情報として)

結果はエラー(投入不可)と警告(要目視)に分けて出力する。

## P2: 写真ゼロ対策 — カードのフォールバック強化

現状 `spot-card.tsx` のフォールバックは全カード同一の足跡アイコンで、110件並ぶと単調。写真収集は著作権的に自動化しないため、写真なしでも成立するカードにする。

実装方針(推奨): スポットの lat/lng・courseType・タグから決定的に生成するミニビジュアル
- 背景: 都道府県 or タグ(park/riverside/seaside/track等)に応じたグラデーション。同一スポットは常に同じ見た目(slugのハッシュで色相をずらす)
- 前景: courseType(loop/out-and-back/one-way)を表す簡単なSVGライン + 距離の大数字
- 外部API・画像生成は使わない。純粋なCSS/SVGでOK
- 既存のデザイントークン(DESIGN.md §9.1)の範囲で配色する

詳細ページのヒーロー画像なし時も同じコンポーネントを流用する。

## P3: SEO仕上げ

- `src/app/sitemap.ts` を追加: 全スポット詳細 + 固定ページ。DBから動的生成
- `src/app/robots.ts` を追加: `/admin` をDisallow、sitemapを参照
- スポット詳細に構造化データ(JSON-LD, `SportsActivityLocation` または `Place`)を追加
- `NEXT_PUBLIC_SITE_URL` をベースURLに使う

## P4: 公開(人間の作業を含む)

1. `git init` してinitial commit(node_modules/.next/.env.local は.gitignore済みか確認)
2. Cloudflareアカウントで `npx wrangler login` → `npx wrangler r2 bucket create dokorun-images`(画像を使う場合)
3. シークレット設定: `npx wrangler secret put` で DATABASE_URL(Neon本番)・ADMIN_PASSWORD・SESSION_SECRET。R2公開URLは wrangler.jsonc の vars に R2_PUBLIC_URL を追加
4. 本番DBに対して `db:push` → `db:seed` → `db:import`(P0と同じ手順)
5. `npm run deploy` でCloudflare Workersへデプロイ(READMEの「Cloudflareへのデプロイ」参照)

## P5: 公開後の運用タスク (2026-07-07 更新)

完了済み:

- Google Search Console: https://dokorun.com/ をURLプレフィックスで登録・所有権確認済み(layout.tsxのmetaタグ + public/googlebc7bc599f52dfc4c.html)。sitemap.xml送信済み(送信直後は「取得できませんでした」表示。数日後にステータス確認)
- Cloudflare Web Analytics: **計測稼働中(2026-07-07)**。ダッシュボードでdokorun.comのサイトをAutomatic setup(RUM: Enable)で作成済みで、エッジがJSスニペットを自動注入している。**wrangler.jsonc の `CF_BEACON_TOKEN` は空のままにすること**(トークンを設定するとlayout.tsxの手動ビーコンと自動注入で二重計測になる。手動方式に切り替えるならダッシュボードで「Enable with JS Snippet installation」に変更してから)

- GPX review/skip 27件: **本番で非掲載化済み(2026-07-07)**。`is_published = false`(NeonのSQL Editorで実行)。うち井の頭恩賜公園・彩湖はユーザー実走GPXでコースを整備して同日復帰(現在: 掲載93件・非掲載25件)。詳細と復帰手順は docs/gpx-course-task.md の進捗表冒頭の注記を参照

残り(人間の作業):

1. **外形監視**: UptimeRobot等で https://dokorun.com/ と /spots/kokyo (DB経由)を5分間隔で監視

任意(急ぎではない):

- 非掲載スポットの復帰: ユーザー実走GPX(井の頭・彩湖方式が最良) or Stravaセグメント再探索(APIトークン再発行が必要) or gpx.studio手動トレースでコースを整備できたものから `is_published = true` に戻す。複数周回ログの1周切り出しは実績あり(6周→中央値の周を採用)

## 東京都内スポットの追加調査分 (2026-07-08)

deep-researchレポートの21候補のうち、Stravaセグメント由来のコースを確保できた14件を掲載済み、豊洲ぐるり公園はreview非掲載(docs/gpx-course-task.md #119〜133)。以下の6件は**コースの裏付けが取れず未投入**(DBにも入れていない)。再挑戦する場合は現地実走GPXかgpx.studio手動トレースが必要:

- シンボルプロムナード公園(港区/江東区): 公式5kmコース・1km毎距離表示ありだが該当セグメントなし。ペデストリアンデッキ主体でBRouterでの正確な再現が難しい
- 境川ゆっくりロード(町田市): 公式約14.5kmの自転車歩行者専用道。全線セグメントなし。一部工事休止区間あり
- 善福寺川緑地・和田堀公園(杉並区): 全長約4.2kmの帯状公園。セグメントは細切れ(Zenpukuji S-N TT 1482m等)のみ
- ソラムナード羽田緑地(大田区): 全長2.0km。該当セグメントなし
- 若洲海浜公園(江東区): ゲートブリッジのセグメントのみで公園周回コースなし
- 浅川ゆったりロード(八王子市): 該当セグメントなし。距離も公式未確認

## P6: フェーズ2(反応を見て着手判断)

DESIGN.md 付録A参照。優先順: Clerk認証 → ハシリタイ実動化 → 走リ活投稿。Web Analyticsの数字を見てから。

---

## やらないこと

- 写真の自動スクレイピング(著作権リスク)
- GPXの自動生成(実測データではないものを載せない)。主要スポットから手動で順次登録する
