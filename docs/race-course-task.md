# タスク: 大会試走ページの大会コース整備

/races/{slug} の「大会コース」セクションに表示する、実際の大会コース(LineString)を1大会ずつ整備する。末尾の進捗表の上から順に処理すること。

## 背景

- 大会定義は `src/lib/races.ts`。コース有無は `src/lib/race-courses.json`(マニフェスト)で判定され、実体は `public/race-courses/<race-slug>.json`(簡略化LineString)を `RaceCourseMap` がクライアント取得して描画する
- DBは使わない。geojsonをWorkerバンドルに入れない(3MiB制限)ための静的アセット構成
- `itabashi-city-marathon` は大会当日の実走GPSデータ由来(source=gps)で登録済みの見本。**触らないこと**
- ページ上の免責文はマニフェストの `source` で切り替わる: `gps`=実走データ由来 / `map`=公式コース図をもとにした参考図

## データソースの優先順位

1. **実走GPSデータ(source=gps)**: その大会を当日走ったランナーのGPXが手に入る場合は最優先。HINODEメンバー等からの提供分は `data/race-gpx/<slug>.gpx` に置いて手順4から
2. **公式サイトのGoogle My Maps埋め込み(source=map)**: 多くの大会が公式サイトのコースページにMy Mapsを埋め込んでおり、KMLで走路LineStringがそのまま取れる。**最も正確で速い**(東京・富士山で実績、誤差+0.2%/+2.2%)。下記「My Maps手順」参照
3. **公式コース図からのBRouter再現(source=map)**: My Mapsがない大会のみ。公式のコース図・通過ポイント表を参照して経由点を置き、実在道路にスナップさせて再現する

**出典不明のGPXを他サイトからダウンロードして流用しないこと**(規約・権利の問題)。公式が公開しているコースデータの参照や、公式コース図を「見て」経由点を自分で置くのはOK。

## My Maps手順(source=map・推奨)

```bash
# 1. 公式コースページのHTMLから埋め込みMIDを探す
curl -sL -A "Mozilla/5.0" "<公式コースページURL>" | grep -oE 'google\.com/maps/d/embed\?mid=[A-Za-z0-9_-]+'
# 2. KMLを取得
curl -sL -A "Mozilla/5.0" "https://www.google.com/maps/d/kml?mid=<MID>&forcekml=1" -o /tmp/course.kml
# 3. GPXに変換(LineString名は --name なしで一度実行すると候補が出る)
node scripts/kml-to-gpx.mjs /tmp/course.kml data/race-gpx/<slug>.gpx --name 走路
```

- KMLの`<Document><name>`で**開催年が最新**であることを確認する(古いマップが残っていることがある。東京は2020と2026が併存していた)
- MultiGeometryで走路が分割されている場合、各ブロックの端点がstderrに出る。スタート/フィニッシュのマーカー座標と突き合わせて `--blocks 0r,1r` のように連結順・向きを指定する(rは逆順)
- 変換後は必ず手順3(検証)へ

## 1大会の処理手順(source=map の場合)

### 1. 公式コースを調べる

大会公式サイトのコース図(PDF/画像)と、Wikipediaやコース紹介記事の通過ポイント列を確認する。以下を書き出す:

- スタート/フィニッシュ地点(座標まで)
- 主要通過点と折返し点(順番どおり)。折返しの重複区間がどこかを必ず把握する
- 公式距離(フル42.195km / ハーフ21.0975km)

コースは年により変わる。**直近開催のコース**を正とする。

### 2. BRouterでGPXを生成する

経由点を走行順に並べ、実在の道路にスナップさせる。折返しは 手前→折返し点→戻り の順で経由点を置けば往復になる:

```bash
curl -s --max-time 60 "https://brouter.de/brouter?lonlats=<lng1>,<lat1>|<lng2>,<lat2>|...&profile=shortest&alternativeidx=0&format=gpx" -o data/race-gpx/<race-slug>.gpx
```

- リクエスト間に2〜3秒スリープ。連続失敗したら中断
- 経由点は車道上(マラソンは車道を走る)。42kmで15〜30点が目安。ショートカットされる区間には点を足す
- URLが長くなりすぎる場合は分割生成して連結してよい(trkptを順に結合)

### 3. 検証する

```bash
npm run gpx:check -- data/race-gpx/<race-slug>.gpx
```

**合格基準(すべて満たすこと):**

- `distanceKm` が公式距離の **±3%以内**(フルなら40.9〜43.5km)。±3%を超えたら経由点を見直す(ショートカット・遠回り・折返し漏れ)
- 座標列を https://geojson.io で目視し、公式コース図と形を見比べる。折返しの本数と位置が合っているか、変な飛びがないかを確認
- スタート/フィニッシュ位置が公式と一致

### 4. 登録する

```bash
npm run race-gpx:apply -- <race-slug> data/race-gpx/<race-slug>.gpx --source <gps|map>
```

- `public/race-courses/<slug>.json` と `src/lib/race-courses.json` が更新される
- GPX原本は `data/race-gpx/<slug>.gpx` に必ず残す(原本保全)
- ローカルで http://localhost:3000/races/<slug> を開き、地図の形を最終確認する

### 5. 進捗表を更新する

- `done` — 合格基準を満たして登録済み
- `review` — 生成したが自信がない。**登録せず**GPXだけ残して理由をメモに書く
- `skip` — 公式コースが特定できない等。理由をメモに書く

**自信がないものを無理に登録しないこと。** 距離が合っていても折返し位置が違えば「嘘の地図」になる。雑なコースを公開するより無い方がよい。

## 進捗表

| # | race-slug | 大会名 | 公式距離 | ステータス | メモ |
|---|-----------|--------|----------|-----------|------|
| 0 | itabashi-city-marathon | 板橋Cityマラソン | 42.195km | done | 実走GPS由来(source=gps)。見本 |
| 1 | tokyo-marathon | 東京マラソン | 42.195km | done | 公式My Maps KML由来(mid=1jGYjkrF_m5K3rWgYJu1XqyMbjHPq2pQ)。42.28km。ブロック連結 0r,1r |
| 2 | osaka-marathon | 大阪マラソン | 42.195km | done | 公式My Maps KML由来(mid=1pWXP58aD4dUxOsWy6nTnC8iqO31PGfc)。2026年コース、42.72km |
| 3 | kyoto-marathon | 京都マラソン | 42.195km | done | 公式図の主要通過地点を道路スナップして再現、41.90km |
| 4 | nagoya-womens-marathon | 名古屋ウィメンズマラソン | 42.195km | done | ドーム・熱田・名古屋城など公式図の主要地点から再現、41.41km |
| 5 | kobe-marathon | 神戸マラソン | 42.195km | done | 三宮・須磨方面・港湾部の主要地点から再現、41.28km |
| 6 | yokohama-marathon | 横浜マラソン | 42.195km | done | みなとみらい・本牧・南部方面の主要地点から再現、43.44km |
| 7 | fukuoka-marathon | 福岡マラソン | 42.195km | done | 天神から糸島まで公式コース図の主要地点を道路スナップ、41.32km |
| 8 | hokkaido-marathon | 北海道マラソン | 42.195km | done | 2026公式コース全体図と公式通過道路をもとにBRouterで再現。43.29km |
| 9 | kanazawa-marathon | 金沢マラソン | 42.195km | done | 市街地7ゾーンの主要地点を道路スナップして再現、42.85km |
| 10 | beppu-oita-marathon | 別府大分毎日マラソン | 42.195km | done | うみたまご・亀川漁港折返し・大分市陸上競技場を結んで再現、41.04km |
| 11 | fujisan-marathon | 富士山マラソン | 42.195km | done | 公式My Maps KML由来(mid=12E1VSHKzA2tl3l7p1JOP7NOA2ikgzug、mtfujimarathon.com/course/に埋め込み)。43.13km(手描き線のため+2.2%、許容) |
| 12 | tazawako-marathon | 田沢湖マラソン | 42.195km | done | 確認済み湖畔一周GPXに公式図の往復区間を加えて再現、42.20km |
| 13 | suwako-marathon | 諏訪湖マラソン | 21.0975km | done | 確認済み湖畔一周GPXに2026公式図の調整区間を加えて再現、21.18km |
| 14 | aoshima-taiheiyo-marathon | 青島太平洋マラソン | 42.195km | done | 運動公園・市街地・青島方面の主要地点から再現、42.88km |
| 15 | shimonoseki-kaikyo-marathon | 下関海響マラソン | 42.195km | done | 海峡メッセ・関門海峡沿い・折返し区間を再現、43.09km |
| 16 | ibigawa-marathon | いびがわマラソン | 21.0975km | done | 2026年はハーフのみ。公式通過地点を道路スナップして再現、20.86km |
| 17 | naha-marathon | NAHAマラソン | 42.195km | done | 公式My Maps KML由来(mid=1fJUo7rUVxmTC_kiE_2yKcsLUE7xfxqE)。2025年公認コース、42.73km |
| 18 | ehime-marathon | 愛媛マラソン | 42.195km | done | 松山市街地から北条方面の公式主要地点を道路スナップ、42.42km |
| 19 | saitama-marathon | さいたまマラソン | 42.195km | done | さいたま新都心から浦和・東部方面の主要地点を再現、43.40km |
| 20 | mito-komon-marathon | 水戸黄門漫遊マラソン | 42.195km | done | 水戸市街地・西部折返し・千波湖の主要地点を再現、42.59km |

### 調査メモ(2026-07-11)

- My Maps埋め込み調査済み: marathon.tokyo=**あり**(登録済み)、mtfujimarathon.com=**あり**(登録済み)。kanazawa-marathon.jp/course/、kobe-marathon.net/course/、osaka-marathon.com/2026/course/、kyoto-marathon.com/course/ は埋め込み**なし**(コースページのURLが違う可能性もあるので、サイト内の他ページも `grep google.com/maps/d` で探す価値あり)
- 大阪マラソン2026公式ページでMy Maps埋め込みを確認し登録済み。`走路　Route` レイヤーを使用。短い「（ランの部）コース」レイヤーは7.29kmしかないため不採用。
- NAHAマラソン公式コースページのMy Mapsから、公認コースのLineStringを取得して登録済み。2026ページ上の埋め込みマップ名は2025だが、公式ページでは同じ平和祈念公園コースを現行コースとして案内している。
- 北海道マラソンは2026公式PDF(2026年5月19日作成)の全体図と公式大会要項の通過道路列を突合し、南側5km区間、新川通折返し、北海道大学内を含む参考コースとして登録した。
- 埋め込みがない大会も、RUNNET・大会結果ページ・自治体観光ページ等にMy Mapsが載っていることがある。「<大会名> google my maps」「<大会名> コース kml」でも検索してみる
