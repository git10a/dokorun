# タスク: Runtrip人気コースの参考データ収集(リサーチ)

runtrip.jp の公開コース一覧から「人気コース」(行きたい数つき)のリストを数百件収集し、ドコランで次に整備すべきコースの優先順位付けに使う**内部参考データ**を作る。

## 方針(最重要・逸脱禁止)

- 収集データは**優先順位付けのための社内リサーチ用**。ドコランのDBやページに runtrip 由来のテキスト・画像・ルートを入れてはならない
  - `description` 原文の転載禁止(掲載時は自分の言葉で書き直す)
  - 画像URL(cloudfront)のダウンロード・転載禁止
  - ルートデータはそもそも未認証では取れない。掲載時のGPXは既存のStravaパイプライン(explore→streams→往復化/連結→サムネ目視QC)で自前生成する
- 丁寧なクロール: リクエスト間に **1.5〜2秒スリープ**、UAは通常ブラウザ相当を明示、総リクエストは全体で**150以下**に収める。HTTP 4xx/5xxが3連続したら中断して報告
- `https://api.runtrip.jp/v1/courses` の**直叩きは401になる(試行済み)。認証回避を試みないこと**。取得はすべて公開HTMLページのSSRデータ経由で行う

## 技術調査の結果(2026-07-10 検証済み)

- robots.txt は `Allow: /`(全許可)。sitemap: `https://runtrip.jp/sitemap-0.xml`
- 一覧ページは Next.js SSR。HTML内の `<script id="__NEXT_DATA__" type="application/json">` にAPIレスポンスがまるごと埋まっている(**認証不要**)
- JSONパス: `props.pageProps.swr.fallback["https://api.runtrip.jp/v1/courses?...:$get"]` → `{ metadata: { total, pageNumber, pageSize }, courses: [ { course: { user: {...}, course: {...} }, isFavorited, isVisited }, ... ] }`
  - 内側の `course.course` が本体。fallbackのキー名は動的なので「`/v1/courses` を含むキー」で探すこと
- URLパターン(クエリ `?sort=1` が**人気順=行きたい数降順**。sort=5が新着):
  - 全国: `https://runtrip.jp/courses?sort=1`(total約10,145件)
  - 都道府県: `https://runtrip.jp/courses/{pref-slug}?sort=1`(例: tokyo は total 2,369件)
  - 市区町村: `https://runtrip.jp/courses/{pref-slug}/{JIS市区町村コード}?sort=1`(例: `tokyo/13102` = 中央区、total 110件。sitemap非掲載のコードでも動く)
- **制約: SSRに載るのは各URLの1ページ目20件のみ**。`page=2` 等はSSRに反映されない(検証済み)。件数は地域ドリルダウンで稼ぐ
- 使えるフィールド(`course.course` 直下): `id`, `title`, `description`, `distance`(メートル), `favoriteCount`(=行きたい数), `viewCount`, `visitCount`, `prefecturesId`, `prefecturesName`, `areaId`, `areaName`, `address`, `startLatitude`, `startLongitude`, `recommendTimezone`, `signal`, `roadType`, `lamp`, `elevation`, `routeType`, `createdAt`
- コース詳細ページ(`/courses/{id}`)はクライアントサイド描画でSSRデータが空(検証済み)。**詳細ページは叩いても何も取れないので叩かない**

### 都道府県slug一覧(sitemap由来。prefecturesId 1〜47 = JIS順と一致)

```
hokkaido aomori iwate miyagi akita yamagata fukushima
ibaraki tochigi gunma saitama chiba tokyo kanagawa
niigata toyama ishikawa fukui yamanashi nagano gifu shizuoka aichi mie
shiga kyoto osaka hyogo nara wakayama
tottori shimane okayama hiroshima yamaguchi
tokushima kagawa ehime kochi
fukuoka saga nagasaki kumamoto oita miyazaki kagoshima okinawa
```

## 手順

### 1. 取得スクリプトを書く

`scripts/research/fetch-runtrip-popular.mjs` を新規作成(Node標準の `fetch` でOK、依存追加不要)。処理:

1. 全国 `?sort=1` を1回取得(全国トップ20)
2. 47都道府県を順に `?sort=1` で取得(47リクエスト)
3. 手順2の `metadata.total` が **200件を超えた都道府県**だけ、主要市区町村にドリルダウン(1都道府県あたり最大10市区町村、全体で90リクエスト以内)。市区町村のJISコードは総務省の全国地方公共団体コード表に基づき、人口の多い区・市を優先(例: 東京23区は 13101〜13123、横浜 14100番台、大阪 27100番台、名古屋 23100番台、札幌 01100番台、福岡 40130番台、京都 26100番台、神戸 28100番台)
4. 各レスポンスから `course.course` を抽出し、`id` で重複排除(同じコースが全国/都道府県/市区町村に重複して出る)
5. パース: `/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s` で抜いて `JSON.parse` → fallback内の `/v1/courses` を含むキーを探す。パース失敗やコース0件のページはスキップしてログに残す

### 2. 出力する

- `data/research/runtrip-popular.json` — 全件・全フィールド + 取得元(どのページで拾ったか)と取得日
- `docs/research/runtrip-popular.md` — レビュー用: `favoriteCount` 降順の上位300件の表。列: 順位 / タイトル / 都道府県・エリア / 距離km(小数1桁) / 行きたい数 / 開始座標 / runtrip URL(`https://runtrip.jp/courses/{id}`)/ 既存スポットとの距離

### 3. 既存スポットと突き合わせる

DB(ローカル)の公開スポット全件(現在134件)の座標を取得し、各コースの `startLatitude/startLongitude` から**最寄り既存スポットまでの距離**を計算(ハーバーサインでよい)。2km以内なら「既存重複候補」としてスポットslugをJSONと表の両方に記録する。DB接続はローカルD1( `npm run` 系の既存手順)またはシードデータを参照。読み取りのみで**DBへの書き込みは一切しない**

## 合格基準

- ユニークコース **500件以上**(想定: 全国20 + 47×20 + ドリルダウンで重複除いても800件前後になるはず。500を大きく割る場合はパース漏れを疑う)
- `favoriteCount >= 10` のコースが300件以上
- 全コースの座標が日本のbbox内(lat 24〜46, lng 122〜154)。外れ値は `kaigai` 混入かパースミス
- JSONが `JSON.parse` で読め、`id` 重複ゼロ
- 総リクエスト数・スキップしたページ・エラーをスクリプト末尾でサマリ出力

## 注意

- パッケージ管理は **npm**(pnpmはこのマシンで壊れている)
- 他のエージェントが同リポジトリを並行編集することがある。編集前に対象ファイルの最新状態を確認する
- このタスクの範囲は**データ収集とレビュー資料の作成まで**。コースのドコラン掲載(GPX生成・DB投入)は別タスク(既存のStravaパイプライン手順に従う)

## このタスクの後(参考・範囲外)

上位リストから「ドコラン未掲載 × 行きたい数が多い × エリア分散」でコースを選定し、Stravaセグメントから自前GPXを整備して掲載する。既存の掲載134件とエリア47ページ構成に接続する。
