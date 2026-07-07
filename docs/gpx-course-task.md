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

| # | slug | 名前 | 所在地 | 期待距離(m) | ステータス | メモ |
|---|------|------|--------|-------------|-----------|------|
| 1 | kokyo | 皇居 | 東京都千代田区 | 5011 | done | Strava実走GPX(data/gpx/kokyo.gpx) |
| 2 | komazawa | 駒沢オリンピック公園 | 東京都世田谷区 | 2140 | done | BRouter生成。公式ジョギングコースに並走する園路を反時計回り（2.04km） |
| 3 | yoyogi | 代々木公園 | 東京都渋谷区 | 1907 | done | 実走ログ10周から1周切り出し(data/gpx/yoyogi.gpx) |
| 4 | arakawa | 荒川河川敷（赤羽） | 東京都北区 | 10000 | done | BRouter生成 11459m |
| 5 | senbako | 千波湖 | 茨城県水戸市 | 3000 |  |  |
| 6 | oohori | 大濠公園 | 福岡県福岡市中央区 | 2000 | done | BRouter生成 2055m |
| 7 | osakajo | 大阪城公園 | 大阪府大阪市中央区 | 3500 | done | BRouter生成 3906m |
| 8 | meijo | 名城公園 | 愛知県名古屋市北区 | 1300 | done | BRouter生成 1121m |
| 9 | makomanai-park | 真駒内公園 | 北海道札幌市南区 | 3000 | done | BRouter生成 3098m |
| 10 | iwate-undou-park | 岩手県営運動公園 | 岩手県盛岡市 | 1500 | done | BRouter生成 1642m |
| 11 | nanakita-park | 七北田公園 | 宮城県仙台市泉区 | 3200 | done | BRouter生成 3252m |
| 12 | akita-chuo-park | 秋田県立中央公園 | 秋田県秋田市 | 4000 |  |  |
| 13 | yamagata-sogo-undokoen | 山形県総合運動公園 | 山形県天童市 | 2000 |  |  |
| 14 | azuma-sports-park | あづま総合運動公園 | 福島県福島市 | 3000 |  |  |
| 15 | doho-park | 洞峰公園 | 茨城県つくば市 | 1630 |  |  |
| 16 | shikishima-park | 敷島公園 | 群馬県前橋市 | 700 |  |  |
| 17 | saiko-doman-green-park | 彩湖・道満グリーンパーク | 埼玉県戸田市 | 4200 |  |  |
| 18 | kashiwanoha-park | 柏の葉公園 | 千葉県柏市 | 2000 |  |  |
| 19 | niigata-sports-park | 新潟県スポーツ公園 | 新潟県新潟市中央区 | 5000 |  |  |
| 20 | kansui-park | 富岩運河環水公園 | 富山県富山市 | 5000 |  |  |
| 21 | kibagata-park | 木場潟公園 | 石川県小松市 | 6400 |  |  |
| 22 | lake-yamanaka-loop | 山中湖 | 山梨県山中湖村 | 13600 |  |  |
| 23 | shinshu-sky-park | 信州スカイパーク | 長野県松本市 | 10000 |  |  |
| 24 | sanaruko-park | 佐鳴湖公園 | 静岡県浜松市中央区 | 5941 |  |  |
| 25 | odaka-ryokuchi | 大高緑地 | 愛知県名古屋市緑区 | 2500 |  |  |
| 26 | otsu-kogan-nagisa-park | 大津湖岸なぎさ公園 | 滋賀県大津市 | 5000 |  |  |
| 27 | takaragaike-park | 宝が池公園 | 京都府京都市左京区 | 1500 |  |  |
| 28 | nagai-park | 長居公園 | 大阪府大阪市東住吉区 | 2800 |  |  |
| 29 | akashi-park | 明石公園 | 兵庫県明石市 | 2000 |  |  |
| 30 | kimiidera-park | 紀三井寺公園 | 和歌山県和歌山市 | 2000 |  |  |
| 31 | koyamaike-park | 湖山池公園 | 鳥取県鳥取市 | 18000 |  |  |
| 32 | okayama-sogo-ground | 岡山県総合グラウンド | 岡山県岡山市北区 | 2500 |  |  |
| 33 | ishin-hyakunen-kinen-park | 維新百年記念公園 | 山口県山口市 | 3000 |  |  |
| 34 | haruno-sogo-undokoen | 春野総合運動公園 | 高知県高知市 | 3200 |  |  |
| 35 | suizenji-ezuko-park | 水前寺江津湖公園 | 熊本県熊本市東区 | 3800 |  |  |
| 36 | nagasaki-athletic-park | 長崎県立総合運動公園 | 長崎県諫早市 | 2000 |  |  |
| 37 | hinata-miyazaki-sports-park | ひなた宮崎県総合運動公園 | 宮崎県宮崎市 | 2000 |  |  |
| 38 | okinawa-athletic-park | 沖縄県総合運動公園 | 沖縄県沖縄市 | 3000 |  |  |
| 39 | kiba-park | 木場公園 | 東京都江東区 | 3500 |  |  |
| 40 | sarue-onshi-park | 猿江恩賜公園 | 東京都江東区 | 1090 |  |  |
| 41 | mizube-sports-garden | 水辺のスポーツガーデン | 東京都江戸川区 | 550 |  |  |
| 42 | yumenoshima-park | 夢の島公園 | 東京都江東区 | 1100 |  |  |
| 43 | keihin-unga-ryokudo | 京浜運河緑道公園 | 東京都品川区 | 2900 |  |  |
| 44 | oi-futo-chuo-kaihin-park | 大井ふ頭中央海浜公園 | 東京都品川区 | 1000 |  |  |
| 45 | shioiri-park | 汐入公園 | 東京都荒川区 | 4600 |  |  |
| 46 | toneri-park | 舎人公園 | 東京都足立区 | 1950 |  |  |
| 47 | hikarigaoka-park | 光が丘公園 | 東京都練馬区 | 3100 |  |  |
| 48 | shinjuku-central-park | 新宿中央公園 | 東京都新宿区 | 1100 |  |  |
| 49 | hanegi-park | 羽根木公園 | 東京都世田谷区 | 630 |  |  |
| 50 | heiwa-no-mori-nakano | 平和の森公園 | 東京都中野区 | 440 |  |  |
| 51 | tetsugakudo-park | 哲学堂公園 | 東京都中野区 | 1100 |  |  |
| 52 | ueno-onshi-park | 上野恩賜公園 | 東京都台東区 | 1800 |  |  |
| 53 | oshima-komatsugawa-park | 大島小松川公園 | 東京都江東区 | 800 |  |  |
| 54 | koganei-park | 小金井公園 | 東京都小金井市 | 3200 |  |  |
| 55 | inokashira-park | 井の頭恩賜公園 | 東京都武蔵野市 | 1500 |  |  |
| 56 | musashinomori-park | 武蔵野の森公園 | 東京都府中市 | 1100 |  |  |
| 57 | fuchu-no-mori-park | 府中の森公園 | 東京都府中市 | 1400 |  |  |
| 58 | showa-kinen-park | 国営昭和記念公園 | 東京都立川市 | 5000 |  |  |
| 59 | rinko-park | 臨港パーク | 神奈川県横浜市西区 | 980 |  |  |
| 60 | nogeyama-park | 野毛山公園 | 神奈川県横浜市西区 | 740 |  |  |
| 61 | negishi-forest-park | 根岸森林公園 | 神奈川県横浜市中区 | 1300 |  |  |
| 62 | shin-yokohama-park | 新横浜公園 | 神奈川県横浜市港北区 | 1750 |  |  |
| 63 | mitsuike-park | 三ツ池公園 | 神奈川県横浜市鶴見区 | 1400 |  |  |
| 64 | mitsuzawa-park | 三ツ沢公園 | 神奈川県横浜市神奈川区 | 1350 |  |  |
| 65 | kodomo-no-kuni | こどもの国 | 神奈川県横浜市青葉区 | 4100 |  |  |
| 66 | tsuzuki-central-park | 都筑中央公園 | 神奈川県横浜市都筑区 | 1700 |  |  |
| 67 | tamagawa-marukobashi-furuichiba | 多摩川河川敷 丸子橋〜古市場 | 神奈川県川崎市中原区 | 7000 |  |  |
| 68 | asamizo-park-cross-country | 相模原麻溝公園クロカンコース | 神奈川県相模原市南区 | 1790 |  |  |
| 69 | ageo-undou-park | 上尾運動公園 | 埼玉県上尾市 | 800 |  |  |
| 70 | saitama-stadium-park | 埼玉スタジアム2002公園 | 埼玉県さいたま市緑区 | 1800 |  |  |
| 71 | soka-park | そうか公園 | 埼玉県草加市 | 1470 |  |  |
| 72 | sainomori-iruma-park | 彩の森入間公園 | 埼玉県入間市 | 1500 |  |  |
| 73 | misato-park | みさと公園 | 埼玉県三郷市 | 1550 |  |  |
| 74 | chiba-park | 千葉公園 | 千葉県千葉市中央区 | 600 |  |  |
| 75 | hanashima-park | 花島公園 | 千葉県千葉市花見川区 | 750 |  |  |
| 76 | 21st-century-forest-park | 21世紀の森と広場 | 千葉県松戸市 | 2600 |  |  |
| 77 | makuhari-inage-seaside | 幕張稲毛シーサイドランニングコース | 千葉県千葉市美浜区 | 13000 |  |  |
| 78 | aoba-no-mori-park | 青葉の森公園 | 千葉県千葉市中央区 | 2000 |  |  |
| 79 | gappo-park | 合浦公園 | 青森県青森市 | 1600 |  |  |
| 80 | tochigi-prefectural-sports-park | 栃木県総合運動公園 | 栃木県宇都宮市 | 3000 |  |  |
| 81 | fukui-undokoen | 福井運動公園 | 福井県福井市 | 2000 |  |  |
| 82 | gifu-memorial-center | 岐阜メモリアルセンター | 岐阜県岐阜市 | 1500 |  |  |
| 83 | sports-garden-suzuka | 三重交通G スポーツの杜 鈴鹿 | 三重県鈴鹿市 | 3000 |  |  |
| 84 | heijo-palace-park | 平城宮跡歴史公園 | 奈良県奈良市 | 3800 |  |  |
| 85 | shinji-lake-north-shore | 宍道湖岸(県立美術館〜松江しんじ湖温泉駅) | 島根県松江市 | 2000 |  |  |
| 86 | hiroshima-castle-loop | 広島城外周 | 広島県広島市中区 | 1500 |  |  |
| 87 | tokushima-central-park | 徳島中央公園 | 徳島県徳島市 | 1700 |  |  |
| 88 | sunport-takamatsu-setoshirube | サンポート高松・せとしるべ | 香川県高松市 | 4000 |  |  |
| 89 | shiroyama-park-horinouchi | 城山公園(堀之内)〜松山城周回 | 愛媛県松山市 | 5600 |  |  |
| 90 | saga-sunrise-park | SAGAサンライズパーク | 佐賀県佐賀市 | 1530 |  |  |
| 91 | oita-sports-park-happy-road | 大分スポーツ公園 ハッピーロード | 大分県大分市 | 5000 |  |  |
| 92 | kotsuki-river-shinyashiki-takamibashi | 甲突川河畔(新屋敷〜高見橋) | 鹿児島県鹿児島市 | 3100 |  |  |
| 93 | toyohira-river-kikusui-kanjokita | 豊平川河川敷(菊水〜環状北大橋) | 北海道札幌市白石区 | 4200 |  |  |
| 94 | nakajima-park | 中島公園 | 北海道札幌市中央区 | 1000 |  |  |
| 95 | moerenuma-park | モエレ沼公園 | 北海道札幌市東区 | 3700 |  |  |
| 96 | hirosegawa-yodobashi-ushigoe | 広瀬川河川敷(澱橋〜牛越橋) | 宮城県仙台市青葉区 | 2000 |  |  |
| 97 | tsutsujigaoka-park | 榴岡公園 | 宮城県仙台市宮城野区 | 1100 |  |  |
| 98 | tsurumai-park | 鶴舞公園 | 愛知県名古屋市昭和区 | 2200 |  |  |
| 99 | shonai-ryokuchi | 庄内緑地 | 愛知県名古屋市西区 | 2300 |  |  |
| 100 | yamazaki-river-kawanabashi-ishikawabashi | 山崎川四季の道(可和名橋〜石川橋) | 愛知県名古屋市瑞穂区 | 2800 |  |  |
| 101 | kamogawa-sanjo-demachiyanagi | 鴨川河川敷(三条大橋〜出町柳) | 京都府京都市中京区 | 4600 |  |  |
| 102 | kyoto-gyoen | 京都御苑 | 京都府京都市上京区 | 4000 |  |  |
| 103 | yodogawa-nishinakajima | 淀川河川公園西中島地区(下流5km折返し) | 大阪府大阪市淀川区 | 10000 |  |  |
| 104 | hattori-ryokuchi | 服部緑地 | 大阪府豊中市 | 5000 |  |  |
| 105 | minato-no-mori-park | みなとのもり公園 | 兵庫県神戸市中央区 | 460 |  |  |
| 106 | hat-kobe-nagisa-park | HAT神戸なぎさ公園 | 兵庫県神戸市中央区 | 2500 |  |  |
| 107 | otagawa-hosuiro-mitaki-asahibashi | 太田川放水路河川敷(三滝駅〜旭橋) | 広島県広島市西区 | 7200 |  |  |
| 108 | seaside-momochi | シーサイドももち海浜公園 | 福岡県福岡市早良区 | 4000 |  |  |
| 109 | island-city-central-park | アイランドシティ中央公園 | 福岡県福岡市東区 | 700 |  |  |
| 110 | katsuyama-park-murasaki-river | 勝山公園・紫川河畔 | 福岡県北九州市小倉北区 | 1900 |  |  |
| 111 | senshu-park | 千秋公園 | 秋田県秋田市 | 1000 |  |  |
| 112 | kajo-park | 霞城公園 | 山形県山形市 | 1800 |  |  |
| 113 | kaiseizan-park | 開成山公園 | 福島県郡山市 | 2000 |  |  |
| 114 | hakusan-park-yasuragitei | 白山公園・信濃川やすらぎ堤 | 新潟県新潟市中央区 | 4000 |  |  |
| 115 | kanazawa-castle-loop | 金沢城公園外周 | 石川県金沢市 | 2100 |  |  |
| 116 | sunpu-castle-park | 駿府城公園 | 静岡県静岡市葵区 | 1700 |  |  |
| 117 | wakayama-castle-park | 和歌山城公園 | 和歌山県和歌山市 | 2000 |  |  |
| 118 | nagasaki-mizube-no-mori | 長崎水辺の森公園 | 長崎県長崎市 | 700 |  |  |
