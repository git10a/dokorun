# サイト軽量化リファクタリング 実装指示書 (2026-07-07)

実装エージェント向けの指示書。DESIGN.md・READMEの規約に従うこと。
pnpmがクラッシュする環境のため、コマンドはすべて `npm run ...` を使う。
他のエージェントが同リポジトリを並行編集することがあるため、編集前に対象ファイルの最新状態を確認する。

## 背景とゴール

これからスポット写真(画像)を本格的に載せていく。画像分の転送量が増える前提で、
**それ以外の転送量・JS実行コストを可能な限りゼロに近づける**のがゴール。

現状の計測済みの問題(重い順):

1. **カードごとに maplibre-gl のフル地図を生成している**
   [spot-card.tsx](../src/components/spot-card.tsx) が写真なしスポットで
   [course-map-thumbnail.tsx](../src/components/map/course-map-thumbnail.tsx) を使い、
   カード1枚につき WebGL の Map インスタンスを1つ作る。
   検索ページは最大20枚、ホームは13枚。maplibre-gl は gzip 約230KB の JS に加え、
   スタイルJSON・グリフ・スプライト・ベクタタイルを**カードごとの視野で**取得する。
   ブラウザの WebGL コンテキスト上限(約16)も超えており、正しく描画されないカードも出うる。
2. **一覧クエリが全コースの生 geojson を返し、RSCペイロードを肥大化させている**
   [data.ts](../src/db/data.ts) の `summarySelection` に `geojson: courses.geojson` が含まれ、
   ホーム・検索・近隣スポットの全カードに全座標が HTML(RSCペイロード)として埋め込まれる。
   コースは最大3,708点(lake-yamanaka-loop)。1件で約90KB、20件のページでは数百KB規模になる。
3. **検索ページの地図サイドバーがモバイルでも動いている**
   [spots-map-shell.tsx](../src/components/map/spots-map-shell.tsx) の `<aside className="hidden md:block">` は
   CSSで非表示なだけでマウントはされるため、モバイルでも maplibre 本体とタイルをダウンロードする。
4. **maplibre の CSS が全ページで読み込まれている**
   [globals.css](../src/app/globals.css) の `@import "maplibre-gl/dist/maplibre-gl.css"`(gzip 約13KB)。
   地図のないページ(ホーム・about等)でも配信される。
5. **画像に最適化パイプラインがない**
   [upload/route.ts](../src/app/api/upload/route.ts) は原本(最大10MB)をそのままR2に置き、
   カード・詳細ページは素の `<img>` で width/height 指定なし・lazy指定なし。
   写真を増やすほど直撃する。

対応はタスク1から順に。タスク1〜4だけでも初期JS・転送量の大半が落ちる。

## 方針(全タスク共通)

- 一覧(カード)には**インタラクティブ地図を一切出さない**。地図操作が必要なのは詳細ページと検索ページの地図パネルだけ
- サーバーコンポーネントで済むものはサーバーで描く。クライアントJSは「操作するもの」にだけ使う
- 変更のたびに `npm run lint` と `npm run test` を通すこと

---

## タスク1: カードのサムネイルを maplibre からサーバー描画SVGに置き換える

### やること

1. 新規コンポーネント `src/components/course-shape.tsx`(**サーバーコンポーネント、"use client"なし**)を作る。
   props: `coords: [number, number][]`(経度・緯度の配列、簡略化済み)、`name: string`、`className?: string`
   - viewBox `0 0 320 180` 固定。座標を等距円筒近似で投影する:
     `x = lng * cos(中心緯度)`, `y = -lat` でXY化 → バウンディングボックスを viewBox に
     アスペクト比維持でフィット(padding 16程度)
   - 背景は既存の [spot-visual.tsx](../src/components/spot-visual.tsx) と同じトーンの淡色ベタ
     (cream系の単色でよい。地図タイルは描かない)
   - コース線: `<polyline>` を `stroke="#1A1A1A"` `strokeWidth 4` `strokeLinejoin/Linecap round` で1本
   - スタート地点(先頭座標)に `#2BA84A` の丸マーカー(白フチ)
   - `role="img"` `aria-label={名前 + "のコース形状"}`
   - 座標が空なら既存 `SpotVisual` にフォールバック
2. [spot-card.tsx](../src/components/spot-card.tsx) の `CourseMapThumbnail` 使用箇所を
   `CourseShape`(写真なし・コースあり)→ `SpotVisual`(コースもなし)の順のフォールバックに差し替える
3. `src/components/map/course-map-thumbnail.tsx` を削除する

### 受け入れ条件

- ホーム・検索ページのカードで maplibre が一切ロードされない
  (DevTools Network で `maplibre` チャンクと `tiles.openfreemap.org` へのリクエストがカード起因で発生しない)
- 写真ありスポットは従来どおり写真、コースなしスポットは従来どおり `SpotVisual`

## タスク2: 一覧クエリから生 geojson を排除し、簡略化座標だけ渡す

### やること

1. `src/lib/simplify.ts` を新規作成: Douglas-Peucker(またはVisvalingam)の純関数
   `simplifyLine(coords: [number, number][], tolerance: number): [number, number][]`。
   依存ライブラリは追加せず自前実装(50行程度)。`tests/` に既存GPX相当の座標での単体テストを追加
2. [data.ts](../src/db/data.ts) を変更:
   - `summarySelection` から `geojson` を外す
   - 代わりにサーバー側で `simplifyLine` を通した**最大60点程度**の `shapeCoords` を
     `SpotSummary` に載せる(toleranceは点数が60を超えなくなるまで2倍にする等の適応式でよい)
   - 60点 × 2値なら1件あたり約2KB。20件でも約40KBに収まる
3. [types.ts](../src/lib/types.ts) の `SpotSummary` を `geojson` → `shapeCoords` に更新し、参照元を追従
4. 詳細ページ [spots/[slug]/page.tsx](../src/app/spots/[slug]/page.tsx) が `CourseMap` に渡す geojson も
   `simplifyLine(coords, 0.00005)`(約5m相当)で間引く。表示品質は変わらず最大ケースで90KB→数KBになる
   (`getNearbySpots` 由来のカードはタスク1の `shapeCoords` を使う)

### 受け入れ条件

- 検索ページ(20件表示)のHTMLレスポンスサイズが変更前より大幅に減っている
  (`curl -s localhost:3000/spots | wc -c` の before/after を記録すること)
- カードのコース形状の見た目が破綻していない(数スポット目視)

## タスク3: 検索ページ地図の無駄ロードをなくす

### やること

[spots-map-shell.tsx](../src/components/map/spots-map-shell.tsx) を修正:

1. デスクトップ用 `<aside>` の `SpotsMap` は、`useEffect` + `matchMedia("(min-width: 768px)")` が
   真のときだけマウントする(モバイルでは open されるまで一切マウントしない)
2. さらにデスクトップでも即時ではなく `requestIdleCallback`(フォールバック `setTimeout` 200ms)後に
   マウントし、検索結果本体のレンダリングを優先する
3. ビューポート変化(回転等)は考慮不要。初回判定のみでよい

### 受け入れ条件

- モバイル幅(375px)で検索ページを開いたとき、「地図で見る」を押すまで
  maplibre チャンクとタイルへのリクエストが発生しない

## タスク4: maplibre CSS のグローバル読み込みをやめる

### やること

1. [globals.css](../src/app/globals.css) から `@import "maplibre-gl/dist/maplibre-gl.css";` を削除
   (`.maplibregl-popup-content` の上書きは、次項のCSSと同じ場所に移す)
2. 地図を実際に使うクライアントコンポーネント([spots-map.tsx](../src/components/map/spots-map.tsx)・
   [course-map.tsx](../src/components/map/course-map.tsx))側で `import "maplibre-gl/dist/maplibre-gl.css";` する。
   これでNextがCSSを地図チャンク側に分割し、地図のないページには配信されなくなる。
   ポップアップ上書きスタイルは `src/components/map/map.css` を新設してそこに移し、同様にコンポーネントから import する

### 受け入れ条件

- ホーム・aboutページのCSSに `maplibregl-` を含むルールが出力されない
- 検索ページ・詳細ページで地図(コントロール・ポップアップ)の見た目が崩れていない

## タスク5: 画像配信コンポーネントとアップロード縮小(写真運用の土台)

R2は現在未有効(wrangler.jsonc 参照)だが、有効化後すぐ正しく動くように先に実装しておく。
`next/image` はOpenNext Cloudflareではデフォルトローダーが使えないため採用しない。

### やること

1. 新規 `src/components/spot-image.tsx`(サーバーコンポーネント)を作る:
   - props: `src`, `alt`, `width`, `height`, `sizes?`, `priority?`, `className?`
   - Cloudflare Image Transformations のURL形式で `srcSet` を生成する:
     `https://dokorun.com/cdn-cgi/image/format=auto,quality=78,width={w}/{元URL}`
     幅は `[320, 640, 960, 1280]` から `width` 以下のものを使う
   - `loading={priority ? undefined : "lazy"}` `decoding="async"`
     `fetchPriority={priority ? "high" : undefined}` を付け、
     `width`/`height` 属性を必ず出力(CLS防止)
   - 環境変数 `NEXT_PUBLIC_IMAGE_TRANSFORM=off` のとき(ローカル開発)は変換プレフィックスなしの素のURLに切り替える
2. 使用箇所を差し替える:
   - [spot-card.tsx](../src/components/spot-card.tsx) のカード写真(`sizes="(min-width: 640px) 224px, 128px"`)
   - 詳細ページの写真カルーセル(1枚目のみ `priority`、`sizes="(min-width: 640px) 60vw, 85vw"`)
3. [upload/route.ts](../src/app/api/upload/route.ts) の手前、
   [image-uploader.tsx](../src/components/admin/image-uploader.tsx) 側で
   Canvas を使い**長辺2048px・JPEG品質0.85に縮小してからアップロード**する
   (10MBの原本をR2に置かない。HEIC等非対応形式はそのままエラーでよい)
4. 詳細ページのOG画像(`openGraph.images`)も `width=1200` の変換URLにする

### 補足

- Cloudflare Image Transformations はゾーンで有効化が必要(ダッシュボード → Images → Transformations)。
  無料プランで月5,000ユニーク変換まで。**この有効化とR2有効化は人間の作業**なので、
  コード側は `NEXT_PUBLIC_IMAGE_TRANSFORM` で切り替え可能にしておく

### 受け入れ条件

- `NEXT_PUBLIC_IMAGE_TRANSFORM=off` のローカルで写真の表示・アップロードが従来どおり動く
- 出力HTMLの `<img>` に width/height/srcset/sizes/loading が正しく付いている(テスト or 目視)

## タスク6: 詳細ページ地図のファサード化(タスク1〜5完了後)

### やること

詳細ページの [course-map.tsx](../src/components/map/course-map.tsx) を「クリックで起動」方式にする:

1. 初期表示はタスク1の `CourseShape`(簡略化座標で描画)+「地図を操作する」ボタンのオーバーレイ
2. クリック(またはIntersectionObserverで可視かつ `requestIdleCallback` 経過)で初めて
   maplibre を import してインタラクティブ地図に差し替える
3. どちらを採るかは実装しやすい方でよいが、**スマホの初期ロードで maplibre のJSとタイルが走らない**こと

### 受け入れ条件

- 詳細ページ初期表示で `tiles.openfreemap.org` へのリクエストが0件
- 操作開始後は従来どおりの地図が使える

## タスク7: 細かい削減(最後にまとめて)

1. [layout.tsx](../src/app/layout.tsx) に `tiles.openfreemap.org` への `preconnect` は**入れない**
   (タスク6完了後は初期ロードでタイルを引かなくなるため不要。代わりにR2公開ホストが決まったら
   そちらへの `preconnect` を検討)
2. `searchSpotsForMap` に `limit 300` を付ける(将来スポット数が増えたときのペイロード上限)
3. `package.json` の `fast-xml-parser` / `zod` / `postgres` / `ws` がサーバー・スクリプト専用で
   クライアントバンドルに混入していないことを確認(`@next/bundle-analyzer` を devDependencies に追加し、
   `ANALYZE=true npm run build` で確認。混入していれば import 経路を直す)

## 検証(全タスク完了後)

1. `npm run lint` / `npm run test` / `npm run build` がすべて通る
2. before/after を記録して結果をこのファイル末尾に追記する:
   - `next build` 出力の First Load JS(/ と /spots と /spots/[slug])
   - 検索ページHTMLのバイト数(タスク2の計測)
   - モバイル幅の検索ページで maplibre・タイルのリクエストが0件であること
3. 目標値: /(ホーム)と /spots の First Load JS が **150KB(gzip)未満**、
   検索ページHTMLが **100KB未満**

## やらないこと(スコープ外)

- ISR・キャッシュ導入(OpenNextのincremental cacheはR2/KVが必要。R2有効化後に別タスクで行う)
- フォント変更(next/font の Noto Sans JP はunicode-range分割で必要分しか落ちないため現状維持)
- 検索ページ地図パネルそのものの廃止などUX変更
- lucide-react の置き換え(Nextの optimizePackageImports 対象でツリーシェイク済み)

---

## 実装・検証結果 (2026-07-07)

タスク1〜7を実装。Next.js 16は通常の `next build` で First Load JS 表を出さないため、
各ルートの初期HTMLが参照するJSを重複排除し、gzipした合計を同一のwebpackビルドで比較した。

| ルート | 初期JS gzip (before) | 初期JS gzip (after) |
| --- | ---: | ---: |
| `/` | 172,640 bytes | 171,901 bytes |
| `/spots` | 171,743 bytes | 171,504 bytes |
| `/spots/kokyo` | 170,946 bytes | 171,935 bytes |

検索HTMLはデフォルト新着順では、未圧縮 179,869 → 182,279 bytes、gzip転送量
24,729 → 22,393 bytes。コース座標が多いスポットを含む距離降順では、未圧縮
209,419 → 193,870 bytes、gzip転送量 32,057 → 25,495 bytesになった。
未圧縮HTMLは既存の20カード分のSSR/RSCマークアップが支配的で、100KB未満には未達。
実転送量は22〜26KBに収まっている。

- 375pxの `/spots` 初期表示: maplibre、OpenFreeMapタイル、`/api/spots/map` は0リクエスト。`地図で見る` 操作後のみ取得
- `/spots/kokyo` 初期表示: OpenFreeMapタイルは0リクエスト。`地図を操作する` 操作後のみ取得
- `/` と `/about`: 配信CSSに `maplibregl-` ルールなし
- `@next/bundle-analyzer` のwebpackレポートで `fast-xml-parser`、`zod`、`postgres`、`node_modules/ws` のクライアント混入なし。maplibreは遅延チャンクのみ
- `npm run lint`、`npm run test` (10件)、`npm run build` 成功

補足: Cloudflare Image TransformationsとR2は指示書記載どおり人手での有効化が必要。
