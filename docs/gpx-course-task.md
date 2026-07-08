# タスク: 全スポットの代表コースGPX整備

掲載中の全公開スポット(118件)に、実際の道路・歩道に沿った代表コース(GeoJSON)を登録する。末尾の進捗表の上から順に、1スポットずつ処理すること。

## 背景

- 各スポットは `courses.geojson`(LineString)を持ち、スポット詳細ページの地図に描画される
- 現状: #1 kokyo と #3 yoyogi は実走GPX由来の正確なコースが登録済み(**触らないこと**)。#2〜8は seed 由来の「合成の円」(ダミー、要置き換え)。#9以降は geojson なし
- DBの `courses.distance_m` には調査済みの「そのコースの実際の距離」が入っている。これが答え合わせの基準になる

## 前提・環境

- パッケージ管理は **npm**(pnpmはこのマシンで壊れている)。DBはDocker上のローカルPostgres(`.env.local` の `DATABASE_URL`)。Dockerが起動していることを確認してから始める
- 他のエージェントが同リポジトリを並行編集することがある。編集前に対象ファイルの最新状態を確認する
- 外部API(BRouter)は無料の公共サービス。**リクエスト間に2〜3秒スリープ**を入れ、連続失敗したら中断する

## 1スポットの処理手順

### 1. コースを調べる

スポット名・都市名から定番の周回/往復コースを特定する。進捗表の「期待距離」(DBのdistance_m)に合うコースを探す。スポットの紹介文(`spots.description`)にコースの説明があるので必ず読むこと:

```bash
npx tsx -e "
import { config } from 'dotenv'; config({ path: '.env.local' });
import { eq } from 'drizzle-orm';
import { getDb } from './src/db';
import { spots } from './src/db/schema';
getDb().query.spots.findFirst({ where: eq(spots.slug, '<slug>') }).then(s => { console.log(JSON.stringify(s, null, 2)); process.exit(0); });
"
```

### 2. BRouterでGPXを生成する

コース上の経由点(4〜7点)を反時計回りまたは実際の走行方向に並べ、実在の道路にスナップさせて生成する。周回コースは最初と最後を同じ座標にする:

```bash
curl -s --max-time 30 "https://brouter.de/brouter?lonlats=<lng1>,<lat1>|<lng2>,<lat2>|...|<lng1>,<lat1>&profile=shortest&alternativeidx=0&format=gpx" -o data/gpx/<slug>.gpx
```

- 経由点は**コースの歩道・園路上**に置く。公園の中心や施設内に置くと `target island detected` エラーになる → 最寄りの通行可能な道に少しずらして再試行
- 公園内のジョギングコースがOSMに載っている場合は `profile=shortest` で園路も通る。通らない場合は `profile=hiking-mountain` も試す
- 往復コース(進捗表の名前に「折返し」等)は 起点→折返し点→起点 の順で経由点を置く

### 3. 検証する

```bash
npm run gpx:check -- data/gpx/<slug>.gpx
```

**合格基準(すべて満たすこと):**

- `distanceKm` が期待距離の **±15%以内**。大きく超える場合は経由点に寄るための往復スパー(同じ道の行き来)が混ざっているか、遠回りしている
- `courseType` がコースの実態と一致(周回なら `loop`、折返しなら `out_and_back`)
- `elevationGainM` が常識的(平地の公園で+100m超えは異常。BRouterの標高は粗いので参考程度)
- トラックポイントを目視でも確認: 座標列をgeojson化して https://geojson.io に貼る、または簡易プロットして、スタート付近の棘(往復スパー)・コース外への膨らみがないか見る

### 4. 登録する

```bash
npm run gpx:apply -- <slug> data/gpx/<slug>.gpx
```

- 出力の `previousDistanceM` と `distanceM` を見比べて妥当性を最終確認
- 既存コース行の `courseType`(track等のキュレーション済み値)は上書きされない(gpx:applyが保持する)
- 代表点(スポットのlat/lng)もGPXのスタート地点で上書きされる。既存の代表点(駅近くの入口など)を維持したい場合は `--keep-latlng` を付ける
- GPXファイルは `data/gpx/<slug>.gpx` に**必ず残す**(原本保全。将来のGPXダウンロード機能の素材になる)

### 5. 進捗表を更新する

処理したら本ファイル末尾の進捗表の該当行を更新する。ステータスは:

- `done` — 合格基準を満たして登録済み
- `review` — 生成はしたが自信がない(距離が±15%を超える、形状が怪しい等)。**登録せず**、GPXだけ残して理由をメモに書く
- `skip` — コースが特定できない/BRouterで生成不能。理由をメモに書く

**自信がないものを無理に登録しないこと。** 雑なコースを公開するより空のままの方がよい。`review`と`skip`は後で人間がgpx.studioで手直しする。

## 進め方

- 進捗表の上から順に処理する(#1 kokyo と #3 yoyogi は完了済みなので飛ばす)
- 1件ごとに commit する(メッセージ例: `feat: 大濠公園の代表コースを登録`)
- 10件処理するごとに、進捗表の集計(done/review/skip件数)を報告する

## 進捗表

> **2026-07-07決定:** review/skipのスポットは本番DBで `is_published = false` にして**非掲載化済み**(2026-07-07に27件。うち井の頭・彩湖は同日ユーザー実走GPXで整備し復帰済み。2026-07-08に#114 hakusan-park-yasuragiteiをGPX破損で追加非掲載化。同日、東京都内の新規15件を追加投入し14件掲載・#122 toyosu-gururi-parkをreview非掲載化→同日ユーザー作成Stravaルートで整備し復帰 → 現在非掲載26件・掲載107件)(雑なコースや未検証データを載せないため)。**2026-07-08夕: ロング走コース25件(#134〜158)をdeep researchから追加投入。21件BRouter整備で掲載、4件(多摩湖・野尻湖・伊東城ヶ崎・芦ノ湖)review非掲載 → 掲載128件・非掲載30件**。`db:import` は登録済みslugをスキップするので再インポートで勝手に復活はしない。復帰させる場合は、コースを整備(Stravaセグメント再探索 or gpx.studio手動トレース)してから `UPDATE spots SET is_published = true WHERE slug = '...'` を実行する。

| # | slug | 名前 | 所在地 | 期待距離(m) | ステータス | メモ |
|---|------|------|--------|-------------|-----------|------|
| 1 | kokyo | 皇居 | 東京都千代田区 | 5011 | done | Strava実走GPX(data/gpx/kokyo.gpx) |
| 2 | komazawa | 駒沢オリンピック公園 | 東京都世田谷区 | 2140 | done | Stravaセグメント Komazawa Park Loop(3939004) 2136m |
| 3 | yoyogi | 代々木公園 | 東京都渋谷区 | 1907 | done | 実走ログ10周から1周切り出し(data/gpx/yoyogi.gpx) |
| 4 | arakawa | 荒川河川敷（赤羽） | 東京都北区 | 10000 | done | BRouter生成 11459m |
| 5 | senbako | 千波湖 | 茨城県水戸市 | 3000 | done | Stravaセグメント 千波湖一周(38335565) 3006m |
| 6 | oohori | 大濠公園 | 福岡県福岡市中央区 | 2000 | done | Stravaセグメント 大濠公園ジョギングコース(3321997) 1968m |
| 7 | osakajo | 大阪城公園 | 大阪府大阪市中央区 | 3500 | done | Stravaセグメント Osaka Castle Loop SW start(4557499) 3434m |
| 8 | meijo | 名城公園 | 愛知県名古屋市北区 | 1300 | done | Stravaセグメント Meijo Park(6751615) 1355m |
| 9 | makomanai-park | 真駒内公園 | 北海道札幌市南区 | 3000 | done | BRouter生成 3098m |
| 10 | iwate-undou-park | 岩手県営運動公園 | 岩手県盛岡市 | 1500 | done | BRouter生成 1642m |
| 11 | nanakita-park | 七北田公園 | 宮城県仙台市泉区 | 3200 | done | BRouter生成 3252m |
| 12 | akita-chuo-park | 秋田県立中央公園 | 秋田県秋田市 | 4000 | review | 生成5473mで期待4000mと乖離。紹介文でも距離が一次情報未確認とされている |
| 13 | yamagata-sogo-undokoen | 山形県総合運動公園 | 山形県天童市 | 2000 | review | 生成2747〜2903mで期待2000mと乖離。園内2kmコースの経路特定要 |
| 14 | azuma-sports-park | あづま総合運動公園 | 福島県福島市 | 3000 | done | Stravaセグメント あづま3kコース(37156072) 3004m |
| 15 | doho-park | 洞峰公園 | 茨城県つくば市 | 1630 | done | Stravaセグメント 洞峰公園C(8475865) 1606m |
| 16 | shikishima-park | 敷島公園 | 群馬県前橋市 | 700 | done | Stravaセグメント 正田醤油スタジアム800m(25308004) 812m |
| 17 | saiko-doman-green-park | 彩湖・道満グリーンパーク | 埼玉県戸田市 | 4200 | done | ユーザー実走GPX 4980m(2026-07-07、data/gpx/saiko-doman-green-park.gpx)。distance_mも4980に更新済み |
| 18 | kashiwanoha-park | 柏の葉公園 | 千葉県柏市 | 2000 | done | BRouter生成 2034m |
| 19 | niigata-sports-park | 新潟県スポーツ公園 | 新潟県新潟市中央区 | 5000 | done | Stravaセグメント 5000ｍ(30440499) 5035m |
| 20 | kansui-park | 富岩運河環水公園 | 富山県富山市 | 5000 | done | Stravaセグメント 冠水公園中島閘門(12945188) 4909m |
| 21 | kibagata-park | 木場潟公園 | 石川県小松市 | 6400 | done | Stravaセグメント 木場潟 左周り（北園地起点6.4km）(18784482) 6407m |
| 22 | lake-yamanaka-loop | 山中湖 | 山梨県山中湖村 | 13600 | done | Stravaセグメント Yamanakako 一周(17743428) 13407m |
| 23 | shinshu-sky-park | 信州スカイパーク | 長野県松本市 | 10000 | done | Stravaセグメント スカイパーク(2882863) 10030m |
| 24 | sanaruko-park | 佐鳴湖公園 | 静岡県浜松市中央区 | 5941 | done | Stravaセグメント 佐鳴湖周回6.1k漕艇場発着(25923240) 6122m |
| 25 | odaka-ryokuchi | 大高緑地 | 愛知県名古屋市緑区 | 2500 | done | BRouter生成 2442m |
| 26 | otsu-kogan-nagisa-park | 大津湖岸なぎさ公園 | 滋賀県大津市 | 5000 | done | BRouter生成 4410m(近江大橋〜大津港の湖岸ワンウェイ) |
| 27 | takaragaike-park | 宝が池公園 | 京都府京都市左京区 | 1500 | done | Stravaセグメント 宝ヶ池(4203904) 1492m |
| 28 | nagai-park | 長居公園 | 大阪府大阪市東住吉区 | 2800 | done | Stravaセグメント 長居公園(5847014) 2840m |
| 29 | akashi-park | 明石公園 | 兵庫県明石市 | 2000 | done | Stravaセグメント akashi-park(14330603) 2137m |
| 30 | kimiidera-park | 紀三井寺公園 | 和歌山県和歌山市 | 2000 | review | 生成が2.6〜5.2kmと不安定。園内周回2kmの経路特定要 |
| 31 | koyamaike-park | 湖山池公園 | 鳥取県鳥取市 | 18000 | done | BRouter生成 18270m |
| 32 | okayama-sogo-ground | 岡山県総合グラウンド | 岡山県岡山市北区 | 2500 | done | Stravaセグメント 総合グランド外周(7220843) 2461m |
| 33 | ishin-hyakunen-kinen-park | 維新百年記念公園 | 山口県山口市 | 3000 | review | 円周経由点が園内で経路化できず(0〜24m)。園路のOSM収録が薄い |
| 34 | haruno-sogo-undokoen | 春野総合運動公園 | 高知県高知市 | 3200 | skip | クロカンコースはOSM未収録で生成不能 |
| 35 | suizenji-ezuko-park | 水前寺江津湖公園 | 熊本県熊本市東区 | 3800 | done | Stravaセグメント 下江津湖 circle course(25347757) 3882m |
| 36 | nagasaki-athletic-park | 長崎県立総合運動公園 | 長崎県諫早市 | 2000 | review | 生成1.4〜1.6kmで公式2kmに届かず。園内ルートの手動指定要 |
| 37 | hinata-miyazaki-sports-park | ひなた宮崎県総合運動公園 | 宮崎県宮崎市 | 2000 | skip | 松林クロカンコースはOSM未収録で生成不能 |
| 38 | okinawa-athletic-park | 沖縄県総合運動公園 | 沖縄県沖縄市 | 3000 | done | BRouter生成 2594m |
| 39 | kiba-park | 木場公園 | 東京都江東区 | 3500 | done | Stravaセグメント Kiba Park 3.5K - 1 lap(22211354) 3466m |
| 40 | sarue-onshi-park | 猿江恩賜公園 | 東京都江東区 | 1090 | done | Stravaセグメント 猿江恩賜公園(8702273) 1025m |
| 41 | mizube-sports-garden | 水辺のスポーツガーデン | 東京都江戸川区 | 550 | review | 550mトラック状コースはOSM未収録。生成791mは別経路 |
| 42 | yumenoshima-park | 夢の島公園 | 東京都江東区 | 1100 | done | Stravaセグメント 夢の島緑道公園(20983143) 1163m |
| 43 | keihin-unga-ryokudo | 京浜運河緑道公園 | 東京都品川区 | 2900 | done | BRouter生成 2979m |
| 44 | oi-futo-chuo-kaihin-park | 大井ふ頭中央海浜公園 | 東京都品川区 | 1000 | done | Stravaセグメント 大井埠頭海浜公園ランニングコース (1km)(7924565) 1013m |
| 45 | shioiri-park | 汐入公園 | 東京都荒川区 | 4600 | done | Stravaセグメント SHIOIRI park jogging trail (11505360) 4477m |
| 46 | toneri-park | 舎人公園 | 東京都足立区 | 1950 | done | Stravaセグメント 舎人公園ランニングコース1周2.0km(35458388) 2026m |
| 47 | hikarigaoka-park | 光が丘公園 | 東京都練馬区 | 3100 | done | Stravaセグメント 光が丘公園ランニングコース(14008783) 3040m |
| 48 | shinjuku-central-park | 新宿中央公園 | 東京都新宿区 | 1100 | done | BRouter生成 1147m |
| 49 | hanegi-park | 羽根木公園 | 東京都世田谷区 | 630 | done | Stravaセグメント 羽根木公園周回　桜ヶ丘中学校口SF(26728614) 595m |
| 50 | heiwa-no-mori-nakano | 平和の森公園 | 東京都中野区 | 440 | skip | 440m周回はOSM未収録で生成不能 |
| 51 | tetsugakudo-park | 哲学堂公園 | 東京都中野区 | 1100 | done | Stravaセグメント 哲学堂公園一周(19878421) 1120m |
| 52 | ueno-onshi-park | 上野恩賜公園 | 東京都台東区 | 1800 | done | Stravaセグメント Tokyo National Museum 1.5km Loop(13657810) 1591m |
| 53 | oshima-komatsugawa-park | 大島小松川公園 | 東京都江東区 | 800 | done | Stravaセグメント 大島小松川公園1周(10010862) |
| 54 | koganei-park | 小金井公園 | 東京都小金井市 | 3200 | done | BRouter生成 2825m |
| 55 | inokashira-park | 井の頭恩賜公園 | 東京都武蔵野市 | 1500 | done | ユーザー実走6周ログから中央値の1周を切り出し 1557m(data/gpx/inokashira-park.gpx) |
| 56 | musashinomori-park | 武蔵野の森公園 | 東京都府中市 | 1100 | done | Stravaセグメント むさもり北1km(18005785) |
| 57 | fuchu-no-mori-park | 府中の森公園 | 東京都府中市 | 1400 | done | BRouter生成 1268m |
| 58 | showa-kinen-park | 国営昭和記念公園 | 東京都立川市 | 5000 | done | Stravaセグメント Showa Kinen Park(19683557) |
| 59 | rinko-park | 臨港パーク | 神奈川県横浜市西区 | 980 | done | BRouter生成 964m |
| 60 | nogeyama-park | 野毛山公園 | 神奈川県横浜市西区 | 740 | review | 生成1325m(期待740m)。動物園周りで大回り |
| 61 | negishi-forest-park | 根岸森林公園 | 神奈川県横浜市中区 | 1300 | done | Stravaセグメント Negishi Part 1 Lap Anti-Clockwise(8626212) |
| 62 | shin-yokohama-park | 新横浜公園 | 神奈川県横浜市港北区 | 1750 | done | Stravaセグメント Shinyokohama Park Loop(7181571) |
| 63 | mitsuike-park | 三ツ池公園 | 神奈川県横浜市鶴見区 | 1400 | done | Stravaセグメント 三ツ池公園一周(6747921) |
| 64 | mitsuzawa-park | 三ツ沢公園 | 神奈川県横浜市神奈川区 | 1350 | done | Stravaセグメント Mitsuzawa Trim1 Loop -1300m(12334048) |
| 65 | kodomo-no-kuni | こどもの国 | 神奈川県横浜市青葉区 | 4100 | done | Stravaセグメント 子供の国一周(21640795) |
| 66 | tsuzuki-central-park | 都筑中央公園 | 神奈川県横浜市都筑区 | 1700 | done | BRouter生成 1941m |
| 67 | tamagawa-marukobashi-furuichiba | 多摩川河川敷 丸子橋〜古市場 | 神奈川県川崎市中原区 | 7000 | done | BRouter生成 7379m |
| 68 | asamizo-park-cross-country | 相模原麻溝公園クロカンコース | 神奈川県相模原市南区 | 1790 | review | クロカンコースはOSM未収録。隣接の沈殿池一周セグメントは別コースのため不採用 |
| 69 | ageo-undou-park | 上尾運動公園 | 埼玉県上尾市 | 800 | review | 生成1501m(期待800m)。園内周回の特定要 |
| 70 | saitama-stadium-park | 埼玉スタジアム2002公園 | 埼玉県さいたま市緑区 | 1800 | done | Stravaセグメント 埼玉スタジアムジョギングコースB(1844m)(16335946) |
| 71 | soka-park | そうか公園 | 埼玉県草加市 | 1470 | review | 生成1719m(期待1470m、+17%惜しい)。経由点微調整で通りそう |
| 72 | sainomori-iruma-park | 彩の森入間公園 | 埼玉県入間市 | 1500 | done | Stravaセグメント 彩の森大回り1周(10613518) |
| 73 | misato-park | みさと公園 | 埼玉県三郷市 | 1550 | done | BRouter生成 1640m |
| 74 | chiba-park | 千葉公園 | 千葉県千葉市中央区 | 600 | done | Stravaセグメント 千葉公園　綿打池ぐるぐる(27349166) |
| 75 | hanashima-park | 花島公園 | 千葉県千葉市花見川区 | 750 | review | 円周経由点が経路化できず(35m) |
| 76 | 21st-century-forest-park | 21世紀の森と広場 | 千葉県松戸市 | 2600 | done | BRouter生成 2403m |
| 77 | makuhari-inage-seaside | 幕張稲毛シーサイドランニングコース | 千葉県千葉市美浜区 | 13000 | review | 生成7.9km(期待13km)。海浜3公園をつなぐ経路の手動指定要 |
| 78 | aoba-no-mori-park | 青葉の森公園 | 千葉県千葉市中央区 | 2000 | done | BRouter生成 1736m |
| 79 | gappo-park | 合浦公園 | 青森県青森市 | 1600 | review | 生成2315m(期待1600m) |
| 80 | tochigi-prefectural-sports-park | 栃木県総合運動公園 | 栃木県宇都宮市 | 3000 | done | BRouter生成 2687m |
| 81 | fukui-undokoen | 福井運動公園 | 福井県福井市 | 2000 | review | 円周経由点が経路化できず(40m) |
| 82 | gifu-memorial-center | 岐阜メモリアルセンター | 岐阜県岐阜市 | 1500 | done | Stravaセグメント メモリアル右回り1.5km(40576370) |
| 83 | sports-garden-suzuka | 三重交通G スポーツの杜 鈴鹿 | 三重県鈴鹿市 | 3000 | done | BRouter生成 2912m |
| 84 | heijo-palace-park | 平城宮跡歴史公園 | 奈良県奈良市 | 3800 | done | BRouter生成 3809m |
| 85 | shinji-lake-north-shore | 宍道湖岸(県立美術館〜松江しんじ湖温泉駅) | 島根県松江市 | 2000 | done | Stravaセグメント 宍道湖畔2km周回(19587711) |
| 86 | hiroshima-castle-loop | 広島城外周 | 広島県広島市中区 | 1500 | done | Stravaセグメント Hiroshima Castle loop clockwise(10535360) |
| 87 | tokushima-central-park | 徳島中央公園 | 徳島県徳島市 | 1700 | done | Stravaセグメント 徳島城公園周回TT（右回り）(19124541) |
| 88 | sunport-takamatsu-setoshirube | サンポート高松・せとしるべ | 香川県高松市 | 4000 | review | セグメントは1.66kmで公式4kmと不一致。海沿い往復の手動指定要 |
| 89 | shiroyama-park-horinouchi | 城山公園(堀之内)〜松山城周回 | 愛媛県松山市 | 5600 | done | BRouter生成 5688m |
| 90 | saga-sunrise-park | SAGAサンライズパーク | 佐賀県佐賀市 | 1530 | done | Stravaセグメント SAGAサンライズパーク いちごさんコース(34688997) |
| 91 | oita-sports-park-happy-road | 大分スポーツ公園 ハッピーロード | 大分県大分市 | 5000 | done | BRouter生成 5237m |
| 92 | kotsuki-river-shinyashiki-takamibashi | 甲突川河畔(新屋敷〜高見橋) | 鹿児島県鹿児島市 | 3100 | review | 生成4.6km(期待3.1km)。橋の座標調整要 |
| 93 | toyohira-river-kikusui-kanjokita | 豊平川河川敷(菊水〜環状北大橋) | 北海道札幌市白石区 | 4200 | review | 生成9.1km(期待4.2km)。橋の座標調整要 |
| 94 | nakajima-park | 中島公園 | 北海道札幌市中央区 | 1000 | done | Stravaセグメント 中島コース(21936660) |
| 95 | moerenuma-park | モエレ沼公園 | 北海道札幌市東区 | 3700 | done | Stravaセグメント モレヌマループコース(27480588) |
| 96 | hirosegawa-yodobashi-ushigoe | 広瀬川河川敷(澱橋〜牛越橋) | 宮城県仙台市青葉区 | 2000 | done | Stravaセグメント Ushigoe Bridge Sprint(12901962) |
| 97 | tsutsujigaoka-park | 榴岡公園 | 宮城県仙台市宮城野区 | 1100 | done | BRouter生成 1192m |
| 98 | tsurumai-park | 鶴舞公園 | 愛知県名古屋市昭和区 | 2200 | done | Stravaセグメント Tsuruma Koen Loop(38588225) |
| 99 | shonai-ryokuchi | 庄内緑地 | 愛知県名古屋市西区 | 2300 | done | Stravaセグメント Shonai 2.3km(12149281) |
| 100 | yamazaki-river-kawanabashi-ishikawabashi | 山崎川四季の道(可和名橋〜石川橋) | 愛知県名古屋市瑞穂区 | 2800 | done | Stravaセグメント ishikawa-yamashita bridge(23452436) 2631m |
| 101 | kamogawa-sanjo-demachiyanagi | 鴨川河川敷(三条大橋〜出町柳) | 京都府京都市中京区 | 4600 | done | BRouter生成 4881m |
| 102 | kyoto-gyoen | 京都御苑 | 京都府京都市上京区 | 4000 | done | BRouter生成 4075m |
| 103 | yodogawa-nishinakajima | 淀川河川公園西中島地区(下流5km折返し) | 大阪府大阪市淀川区 | 10000 | done | BRouter生成 9349m |
| 104 | hattori-ryokuchi | 服部緑地 | 大阪府豊中市 | 5000 | done | BRouter生成 4847m |
| 105 | minato-no-mori-park | みなとのもり公園 | 兵庫県神戸市中央区 | 460 | done | Stravaセグメント みなとのもり公園(16383640) |
| 106 | hat-kobe-nagisa-park | HAT神戸なぎさ公園 | 兵庫県神戸市中央区 | 2500 | done | Stravaセグメント チャレンジラン 1周（2022秋）(33174666) |
| 107 | otagawa-hosuiro-mitaki-asahibashi | 太田川放水路河川敷(三滝駅〜旭橋) | 広島県広島市西区 | 7200 | review | 生成11.6km(期待7.2km)。橋の座標調整要 |
| 108 | seaside-momochi | シーサイドももち海浜公園 | 福岡県福岡市早良区 | 4000 | done | Stravaセグメント シーサイドももち-愛宕浜海浜公園(39727471) |
| 109 | island-city-central-park | アイランドシティ中央公園 | 福岡県福岡市東区 | 700 | review | 生成1121m(期待700m) |
| 110 | katsuyama-park-murasaki-river | 勝山公園・紫川河畔 | 福岡県北九州市小倉北区 | 1900 | done | BRouter生成 2064m |
| 111 | senshu-park | 千秋公園 | 秋田県秋田市 | 1000 | review | 生成1626m(期待1000m)。お堀周回の特定要 |
| 112 | kajo-park | 霞城公園 | 山形県山形市 | 1800 | review | 生成2326m(期待1800m) |
| 113 | kaiseizan-park | 開成山公園 | 福島県郡山市 | 2000 | done | Stravaセグメント あおぞらマラソンコース　2km.ver(26644709) |
| 114 | hakusan-park-yasuragitei | 白山公園・信濃川やすらぎ堤 | 新潟県新潟市中央区 | 4000 | review | Stravaセグメント 5000(30329780)由来のGPXが破損(160m×77mに1095点密集、距離表記5.0km)。2026-07-08に非掲載化。セグメント再取得か実走GPXで整備後に復帰 |
| 115 | kanazawa-castle-loop | 金沢城公園外周 | 石川県金沢市 | 2100 | done | Stravaセグメント 金沢城(7363932) |
| 116 | sunpu-castle-park | 駿府城公園 | 静岡県静岡市葵区 | 1700 | done | Stravaセグメント Shizuoka Sunpu Castle southeast split(28451782) |
| 117 | wakayama-castle-park | 和歌山城公園 | 和歌山県和歌山市 | 2000 | done | Stravaセグメント 和歌山城 時計回り・六番町起点(16251506) |
| 118 | nagasaki-mizube-no-mori | 長崎水辺の森公園 | 長崎県長崎市 | 700 | review | 生成929m(期待700m) |
| 119 | heiwa-no-mori-omori-hamabe | 平和の森公園・大森ふるさとの浜辺公園 | 東京都大田区 | 3198 | done | Stravaセグメント heiwa-no-mori(8784522)+furusato-no-hamabe(8784518)を連結 3198m |
| 120 | tamagawa-ryokuchi-marathon | 多摩川緑地マラソンコース | 東京都大田区 | 2460 | done | Stravaセグメント 多摩川緑地周回(24484492) 2460m |
| 121 | odaiba-kaihin-park | お台場海浜公園 | 東京都港区 | 3154 | done | Stravaセグメント Daiba Beach North Segment(11035687)を往復化 3154m |
| 122 | toyosu-gururi-park | 豊洲ぐるり公園 | 東京都江東区 | 4778 | done | ユーザー作成Stravaルート(3509661238166583110)のexport_gpx。ふ頭外周一周4778m。2026-07-08掲載復帰 |
| 123 | sumidagawa-terrace-sumida | 隅田川テラス(言問橋〜白鬚橋) | 東京都墨田区 | 3406 | done | Stravaセグメント 白鬚橋〜言問橋(11518701)を言問橋起点に往復化 3406m |
| 124 | kyu-nakagawa-riverside | 旧中川沿い | 東京都墨田区 | 5270 | done | Stravaセグメント 旧中川往復(5k)(23562569) 5270m |
| 125 | mizumoto-park | 水元公園 | 東京都葛飾区 | 1479 | done | Stravaセグメント 水元公園周回コース1周_左回り(39669364) 1479m |
| 126 | nakagawa-joryu-katsushika | 中川上流コース | 東京都葛飾区 | 2814 | done | Stravaセグメント 中川周回コース(右回り)(29742227) 2814m |
| 127 | edogawa-kasenjiki-shibamata | 江戸川河川敷(柴又) | 東京都葛飾区 | 5023 | done | Stravaセグメント 柴又公園花壇parkrun(40663562) 5023m |
| 128 | oyokogawa-shinsui-park | 大横川親水公園 | 東京都墨田区 | 1893 | done | Stravaセグメント 大横川親水公園 横川橋→江東橋(10957017)を往復化 1893m |
| 129 | rinshi-no-mori-park | 林試の森公園 | 東京都目黒区 | 2225 | done | Stravaセグメント 林試の森公園外周(13068985) 2225m |
| 130 | johoku-chuo-park | 城北中央公園 | 東京都板橋区 | 1482 | done | Stravaセグメント 城北中央公園 Jogging course(8430072) 1482m |
| 131 | ukima-park | 浮間公園 | 東京都板橋区 | 1220 | done | Stravaセグメント 浮間公園(18041696) 1220m |
| 132 | fuchu-tamagawa-kazenomichi | 府中多摩川かぜのみち | 東京都府中市 | 8414 | done | Stravaセグメント 是政〜川原橋 1周(11134685) 8414m。是政橋〜多摩川原橋の両岸周回 |
| 133 | nogawa-park | 野川公園 | 東京都調布市 | 2655 | done | Stravaセグメント 野川公園ランニング(26948422) 2655m |
| 134 | shiroishi-kokoro-road | 白石こころーど(札幌恵庭自転車道路) | 北海道札幌市白石区 | 18500 | done | BRouter生成 19638m(ラソラ札幌→北広島駅) |
| 135 | zenibako-otaru | 銭函〜小樽観光ランコース | 北海道小樽市 | 17300 | done | BRouter生成 18959m(銭函駅→小樽駅) |
| 136 | omazaki-shimofuro | 津軽海峡 大間崎〜下風呂温泉コース | 青森県大間町 | 20600 | done | BRouter生成 19731m(大間崎→下風呂温泉。終点は国道279沿い41.468,141.092) |
| 137 | natsudomari-asamushi | 夏泊半島〜浅虫温泉コース | 青森県平内町 | 34200 | done | BRouter生成 32117m(役場→半島時計回り→浅虫温泉駅。西岸は県道9号の山越え区間を含む) |
| 138 | yamanote-loop | 山手線一周コース | 東京都千代田区ほか | 40400 | done | BRouter生成 36103m(東京駅起点・主要駅経由の周回) |
| 139 | tamagawa-josui-ryokudo | 玉川上水緑道コース | 東京都新宿区〜武蔵野市 | 16500 | done | BRouter生成 14695m(新宿駅→吉祥寺駅) |
| 140 | tamako-cycling-road | 多摩湖サイクリングロード一周コース | 東京都東村山市 | 17600 | review | 上湖西側の周回園路がBRouterで通れず(西端で+58%の迂回or行き止まりスパー)。非掲載。Stravaルートで整備要 |
| 141 | teganuma-loop | 手賀沼一周コース | 千葉県柏市 | 17600 | done | ユーザー提供GPX 17236m(2026-07-08にBRouter版から差し替え) |
| 142 | inbanuma-loop | 印旛沼ぐるりコース | 千葉県印西市・佐倉市 | 15100 | done | BRouter生成 16343m(佐倉ふるさと広場起点。レポートの龍ヶ谷橋は特定できず代表点変更) |
| 143 | choshi-inubosaki | 銚子海岸〜犬吠埼コース | 千葉県銚子市 | 21800 | done | BRouter生成 21338m(銚子駅→犬吠埼→外川折返し) |
| 144 | suwako-loop | 諏訪湖一周コース | 長野県諏訪市 | 16000 | done | ユーザー提供GPX 16172m(2026-07-08にBRouter版から差し替え) |
| 145 | nojiriko-loop | 野尻湖一周コース | 長野県信濃町 | 15400 | review | 湖東岸〜南岸の周回路がOSM未収録らしく+43〜77%の迂回。非掲載。Stravaルートで整備要 |
| 146 | ibigawa-long | 揖斐川ロングコース | 岐阜県揖斐川町 | 42200 | done | BRouter生成 47288m(役場→横山ダム方面折返し) |
| 147 | hida-kanayama-seiryu | ひだ金山清流コース | 岐阜県下呂市 | 32500 | done | BRouter生成 29321m(飛騨金山駅→馬瀬川上流折返し) |
| 148 | kunozan-toshogu-run | 久能山東照宮参拝コース | 静岡県静岡市 | 22000 | done | BRouter生成 22424m(静岡大橋→久能山石段下折返し) |
| 149 | okushizu-long | 奥静ロングコース | 静岡県静岡市 | 45500 | done | BRouter生成 48543m(静岡駅→梅ヶ島温泉) |
| 150 | mishima-shuzenji | 三嶋大社〜修善寺温泉コース | 静岡県三島市 | 19500 | done | BRouter生成 21704m(三島駅→三嶋大社→修善寺温泉) |
| 151 | ito-jogasaki | 伊東〜城ヶ崎海岸コース | 静岡県伊東市 | 24400 | review | 生成17.6〜21.7kmで期待24.4kmに-15%超。海沿い実コースの経路不明瞭。非掲載。Stravaルートで整備要 |
| 152 | tanzawako-loop | 丹沢湖一周コース | 神奈川県山北町 | 15700 | done | ユーザー作成Stravaルート(3509884731870514956)のexport_gpx 12659m(2026-07-08差し替え。紹介文も約13kmに修正) |
| 153 | ashinoko-loop | 箱根芦ノ湖一周コース | 神奈川県箱根町 | 20000 | review | 東岸歩道(元箱根〜湖尻)がBRouterでtarget island/西岸往復化。非掲載。Stravaルートで整備要 |
| 154 | yurihama-kaigansen | 湯梨浜町海岸線コース | 鳥取県湯梨浜町 | 17200 | done | BRouter生成 18478m(橋津→国道9号沿い往復) |
| 155 | yakushima-seibu-rindo | 屋久島西部林道コース | 鹿児島県屋久島町 | 22700 | done | BRouter生成 25472m(永田いなか浜→大川の滝)。レポートのout_and_backは矛盾のためone_wayに修正 |
| 156 | amami-ayamaru | 奄美あやまる岬コース | 鹿児島県奄美市 | 16000 | done | BRouter生成 17134m(奄美パーク→あやまる岬折返し) |
| 157 | tokunoshima-naoko-road | 尚子ロード特訓コース(徳之島) | 鹿児島県天城町・徳之島町 | 31200 | done | BRouter生成 35715m(与名間→島北部周回) |
| 158 | yoron-loop | 与論島一周コース | 鹿児島県与論町 | 19400 | done | ユーザー提供のヨロンマラソン公式コースGPX(島一周を両方向に往復する42.7km)から往路1周分を切り出し+起点まで834mをBRouterで接続 22867m。原本は data/gpx/yoron-marathon-full.gpx。紹介文も約23kmに修正 |
