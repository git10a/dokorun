# dokorun.com 周辺目的地 Deep Research プロンプト

2026-07-08時点の `https://dokorun.com/sitemap.xml` に掲載されているスポット詳細ページ107件を対象とする。
ローカルDBにしか存在しないスポットは含めていない。

## 使い方

1. 下の「共通プロンプト」をChatGPT Deep Researchへ貼る。
2. プロンプト末尾の `【TARGET_SPOTS】` を「目的地リスト01」から順番に差し替える。
3. 全10回実行する。各回の対象は10〜11拠点。
4. 出力は回ごとに別ファイルで保存する。

## 共通プロンプト

```text
あなたは、日本のランニング体験と地域の魅力を調査するリサーチャーです。

これから渡す TARGET_SPOTS は、ランニングスポット検索サイト「dokorun.com」に実際に掲載されているランニング拠点です。

今回は新しいランニングスポットを探す調査ではありません。TARGET_SPOTS に指定された拠点だけを対象に、それぞれの周辺で「このランニング拠点まで足を運ぶ理由」になる立ち寄り先を調査してください。

## 最重要ルール

- TARGET_SPOTSにないランニング拠点を追加しない
- `spotSlug`、`spotName`、`prefecture`、`city`、`lat`、`lng`、`hasShower`、`hasSentoNearby` は入力値を一字一句そのまま出力する
- 各拠点の `dokorunUrl` を開き、対象の取り違えがないことを確認する
- 公園名やコース名を別の通称・施設名に置き換えない
- 周辺施設は各拠点につき2〜5件だけ厳選する
- 件数合わせのために評価の低い場所や遠い場所を入れない

## 調査の目的

ランニングコースだけでは弱い「そこまで行く理由」を、次のような体験で補強します。

- 走ったあとに評価の高いパン屋へ行く
- カフェ、コーヒースタンド、甘味処で休憩する
- 気軽な食堂、町中華、麺類、定食、地域の名物料理を食べる
- 銭湯、温浴施設、ランニングステーションで汗を流す
- 入浴やシャワーのあとに、評価の高い飲食店へ行く
- その土地を代表する重要な史跡、建築、文化施設を見る

## 選定の優先順位

1. 評価の高いパン屋
2. 評価の高いカフェ、コーヒースタンド、甘味処
3. ランニングウェアでも利用しやすい食堂、町中華、麺類、定食、地域の名物料理
4. 銭湯、温浴施設、ランニングステーション
5. 地域を代表する重要な史跡、建築、文化施設
6. 銭湯・ランステ・拠点内シャワーの利用後に行きたい、評価の高い飲食店

全国チェーン店は、その地域の本店・発祥店・特別店舗など、わざわざ行く理由がある場合を除いて選ばないでください。

## ランニング後の利用条件

ランナーは汗をかき、ランニングウェアを着ている前提です。各施設を必ず次のどちらかに分類してください。

- `direct_after_run`: ランニング直後でも立ち寄りやすい。パン屋、テイクアウト店、カジュアルなカフェや食堂、屋外の史跡など
- `after_cleanup`: 銭湯、温浴施設、ランステ、またはランニング拠点内のシャワーで汗を流したあとに行く。一般的なレストラン、落ち着いた屋内施設など

店舗がランナーを歓迎していると根拠なく断定しないでください。テイクアウト、屋外席、業態、服装条件など、確認できた事実から判断してください。

`after_cleanup` の施設を選ぶ場合は、先に利用する場所を `cleanupPlaceSlug` で指定してください。

- 同じ回答内で選んだ銭湯・ランステを使う場合: その施設の `placeSlug`
- TARGET_SPOTSの `hasShower` が true で、dokorun.com上の設備を利用する場合: `spot_facility`
- 利用できる汗流し設備を確認できない場合: `after_cleanup` の店は選ばない

TARGET_SPOTSの `hasSentoNearby` はdokorun.com掲載値です。trueの場合も、実在する銭湯名、現在の営業状況、距離を改めて調査してください。

## 距離

- 入力された `lat`、`lng` を基本の起点とする
- 大きな公園や長い河川敷では、dokorun.comの対象コースに適した主要出入口を補助的に使ってよい
- 通常は実際の徒歩経路で2km以内
- 特に行く価値が高い場所だけ3km程度まで許可
- 距離と徒歩時間は地図の経路で確認し、直線距離から推測しない
- どの地点を距離の起点にしたか `distanceBasePoint` に書く

## 評価と信頼性

飲食店は原則として、次のいずれかを満たす場所を優先してください。

- Googleマップで4.0以上かつ口コミ50件以上
- 食べログで3.4以上かつ口コミ30件以上
- 百名店、ミシュラン、地域の信頼できる専門媒体、受賞歴などの強い評価根拠がある

点数だけでなく、口コミ数、地域性、名物、ランニング後の利用しやすさを総合して選んでください。評価値と口コミ数は調査時点の値を記録し、推測しないでください。

史跡・文化施設は口コミ点数だけで選ばず、国・自治体・文化財指定・公式観光情報などから、その土地で訪れる意味を確認してください。

## 営業確認

- 調査実行日時点で営業・公開していることを確認する
- 閉業、長期休業、営業状況不明の施設は除外する
- 営業時間と定休日は公式サイトまたは公式SNSを優先する
- 古いまとめ記事だけで営業中と判断しない
- 朝ラン後や昼ラン後に実際に利用できるか考慮する

## 件数と組み合わせ

- 各ランニング拠点につき2〜5件
- 最低1件は飲食関連にする
- 可能ならパン屋またはカフェを1件以上含める
- 銭湯・ランステが近ければ、それ自体も候補に含める
- 同じ種類の店ばかりにせず、その土地らしい組み合わせを優先する
- 十分な候補がない場合は2件未満でもよい。その理由を `researchNote` に書く
- 同じ周辺施設が複数のランニング拠点に適する場合、各拠点との距離や組み合わせ理由を個別に検証したうえで重複掲載してよい

## 出力形式

JSON配列のみを1つのコードブロックで出力してください。前置き、解説、Markdown表は不要です。TARGET_SPOTSと同じ順番で、全拠点を必ず出力してください。

[
  {
    "spotSlug": "入力値をそのまま",
    "spotName": "入力値をそのまま",
    "prefecture": "入力値をそのまま",
    "city": "入力値をそのまま",
    "lat": 35.0000,
    "lng": 139.0000,
    "hasShower": false,
    "hasSentoNearby": false,
    "dokorunUrl": "入力値をそのまま",
    "researchNote": null,
    "places": [
      {
        "rank": 1,
        "placeSlug": "英小文字・数字・ハイフンで一意に",
        "name": "施設の正式名称",
        "category": "bakery",
        "address": "正式住所",
        "lat": 35.0000,
        "lng": 139.0000,
        "distanceFromSpotM": 850,
        "walkingMinutes": 11,
        "distanceBasePoint": "距離計測の起点",
        "visitCondition": "direct_after_run",
        "cleanupPlaceSlug": null,
        "recommendedTiming": "朝ラン後",
        "whyWorthGoing": "名物、歴史、景観、受賞歴など、ここへ行く具体的な理由を80〜160字で記述",
        "runnerFitReason": "ランニング後の利用条件を、確認できた事実に基づいて記述",
        "signatureItems": ["代表商品や名物"],
        "openingHours": "確認できた通常営業時間",
        "closedDays": "確認できた定休日",
        "takeoutAvailable": true,
        "outdoorSeating": false,
        "ratings": [
          {
            "platform": "Google Maps",
            "rating": 4.3,
            "reviewCount": 284,
            "url": "評価と口コミ数を確認できる直接URL"
          }
        ],
        "officialUrl": "公式サイトまたは公式SNSの直接URL",
        "evidenceUrls": [
          "選定理由を確認できる直接URL",
          "営業状況を確認できる直接URL"
        ],
        "confidence": "high",
        "checkedAt": "YYYY-MM-DD"
      }
    ]
  }
]

`category` は次の値だけを使用してください。

- `bakery`
- `cafe`
- `sweets`
- `casual_meal`
- `restaurant`
- `local_specialty`
- `sento`
- `spa`
- `run_station`
- `historic_site`
- `cultural_site`
- `market`

## 出力前チェック

- TARGET_SPOTSの全拠点が同じ順番で出力されている
- 入力されたランニング拠点の値を変更していない
- 各拠点の候補は原則2〜5件
- `after_cleanup` には有効な `cleanupPlaceSlug` がある
- 閉業店や営業不明の店がない
- 評価値、口コミ数、距離、営業時間を推測していない
- URLが検索結果ではなく直接URLになっている
- JSONとして構文が正しい

TARGET_SPOTS:
【TARGET_SPOTS】
```

## 目的地リスト01（11拠点）

```json
[
  {"spotSlug":"nakajima-park","spotName":"中島公園","prefecture":"北海道","city":"札幌市中央区","lat":43.044155,"lng":141.354927,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/nakajima-park"},
  {"spotSlug":"moerenuma-park","spotName":"モエレ沼公園","prefecture":"北海道","city":"札幌市東区","lat":43.121617,"lng":141.429491,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/moerenuma-park"},
  {"spotSlug":"makomanai-park","spotName":"真駒内公園","prefecture":"北海道","city":"札幌市南区","lat":43.011117,"lng":141.344747,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/makomanai-park"},
  {"spotSlug":"iwate-undou-park","spotName":"岩手県営運動公園","prefecture":"岩手県","city":"盛岡市","lat":39.732088,"lng":141.118404,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/iwate-undou-park"},
  {"spotSlug":"tsutsujigaoka-park","spotName":"榴岡公園","prefecture":"宮城県","city":"仙台市宮城野区","lat":38.25943,"lng":140.897699,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tsutsujigaoka-park"},
  {"spotSlug":"hirosegawa-yodobashi-ushigoe","spotName":"広瀬川河川敷(澱橋〜牛越橋)","prefecture":"宮城県","city":"仙台市青葉区","lat":38.266385,"lng":140.844704,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hirosegawa-yodobashi-ushigoe"},
  {"spotSlug":"nanakita-park","spotName":"七北田公園","prefecture":"宮城県","city":"仙台市泉区","lat":38.328015,"lng":140.882793,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/nanakita-park"},
  {"spotSlug":"kaiseizan-park","spotName":"開成山公園","prefecture":"福島県","city":"郡山市","lat":37.397302,"lng":140.355661,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kaiseizan-park"},
  {"spotSlug":"azuma-sports-park","spotName":"あづま総合運動公園","prefecture":"福島県","city":"福島市","lat":37.723253,"lng":140.359943,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/azuma-sports-park"},
  {"spotSlug":"doho-park","spotName":"洞峰公園","prefecture":"茨城県","city":"つくば市","lat":36.062108,"lng":140.125618,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/doho-park"},
  {"spotSlug":"senbako","spotName":"千波湖","prefecture":"茨城県","city":"水戸市","lat":36.371073,"lng":140.454398,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/senbako"}
]
```

## 目的地リスト02（11拠点）

```json
[
  {"spotSlug":"tochigi-prefectural-sports-park","spotName":"栃木県総合運動公園","prefecture":"栃木県","city":"宇都宮市","lat":36.531894,"lng":139.863184,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tochigi-prefectural-sports-park"},
  {"spotSlug":"shikishima-park","spotName":"敷島公園","prefecture":"群馬県","city":"前橋市","lat":36.410954,"lng":139.052835,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shikishima-park"},
  {"spotSlug":"saitama-stadium-park","spotName":"埼玉スタジアム2002公園","prefecture":"埼玉県","city":"さいたま市緑区","lat":35.902925,"lng":139.714195,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/saitama-stadium-park"},
  {"spotSlug":"saiko-doman-green-park","spotName":"彩湖・道満グリーンパーク","prefecture":"埼玉県","city":"戸田市","lat":35.8248,"lng":139.6205,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/saiko-doman-green-park"},
  {"spotSlug":"misato-park","spotName":"みさと公園","prefecture":"埼玉県","city":"三郷市","lat":35.785623,"lng":139.884471,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/misato-park"},
  {"spotSlug":"sainomori-iruma-park","spotName":"彩の森入間公園","prefecture":"埼玉県","city":"入間市","lat":35.837733,"lng":139.398004,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/sainomori-iruma-park"},
  {"spotSlug":"21st-century-forest-park","spotName":"21世紀の森と広場","prefecture":"千葉県","city":"松戸市","lat":35.798746,"lng":139.925004,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/21st-century-forest-park"},
  {"spotSlug":"aoba-no-mori-park","spotName":"青葉の森公園","prefecture":"千葉県","city":"千葉市中央区","lat":35.615235,"lng":140.133215,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/aoba-no-mori-park"},
  {"spotSlug":"chiba-park","spotName":"千葉公園","prefecture":"千葉県","city":"千葉市中央区","lat":35.617363,"lng":140.118047,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/chiba-park"},
  {"spotSlug":"kashiwanoha-park","spotName":"柏の葉公園","prefecture":"千葉県","city":"柏市","lat":35.897462,"lng":139.939283,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kashiwanoha-park"},
  {"spotSlug":"edogawa-kasenjiki-shibamata","spotName":"江戸川河川敷（柴又）","prefecture":"東京都","city":"葛飾区","lat":35.759856,"lng":139.88114,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/edogawa-kasenjiki-shibamata"}
]
```

## 目的地リスト03（11拠点）

```json
[
  {"spotSlug":"mizumoto-park","spotName":"水元公園","prefecture":"東京都","city":"葛飾区","lat":35.791779,"lng":139.871365,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/mizumoto-park"},
  {"spotSlug":"nakagawa-joryu-katsushika","spotName":"中川上流コース","prefecture":"東京都","city":"葛飾区","lat":35.757408,"lng":139.856832,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/nakagawa-joryu-katsushika"},
  {"spotSlug":"sarue-onshi-park","spotName":"猿江恩賜公園","prefecture":"東京都","city":"江東区","lat":35.689462,"lng":139.819531,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/sarue-onshi-park"},
  {"spotSlug":"oshima-komatsugawa-park","spotName":"大島小松川公園","prefecture":"東京都","city":"江東区","lat":35.69281,"lng":139.849762,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/oshima-komatsugawa-park"},
  {"spotSlug":"toyosu-gururi-park","spotName":"豊洲ぐるり公園","prefecture":"東京都","city":"江東区","lat":35.65358,"lng":139.79215,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/toyosu-gururi-park"},
  {"spotSlug":"yumenoshima-park","spotName":"夢の島公園","prefecture":"東京都","city":"江東区","lat":35.648048,"lng":139.835488,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/yumenoshima-park"},
  {"spotSlug":"kiba-park","spotName":"木場公園","prefecture":"東京都","city":"江東区","lat":35.673882,"lng":139.808691,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kiba-park"},
  {"spotSlug":"odaiba-kaihin-park","spotName":"お台場海浜公園","prefecture":"東京都","city":"港区","lat":35.625894,"lng":139.768029,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/odaiba-kaihin-park"},
  {"spotSlug":"shioiri-park","spotName":"汐入公園","prefecture":"東京都","city":"荒川区","lat":35.738819,"lng":139.804957,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shioiri-park"},
  {"spotSlug":"yoyogi","spotName":"代々木公園","prefecture":"東京都","city":"渋谷区","lat":35.669524,"lng":139.699632,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/yoyogi"},
  {"spotSlug":"koganei-park","spotName":"小金井公園","prefecture":"東京都","city":"小金井市","lat":35.717015,"lng":139.51334,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/koganei-park"}
]
```

## 目的地リスト04（11拠点）

```json
[
  {"spotSlug":"shinjuku-central-park","spotName":"新宿中央公園","prefecture":"東京都","city":"新宿区","lat":35.690851,"lng":139.687391,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shinjuku-central-park"},
  {"spotSlug":"hanegi-park","spotName":"羽根木公園","prefecture":"東京都","city":"世田谷区","lat":35.65817,"lng":139.654345,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hanegi-park"},
  {"spotSlug":"komazawa","spotName":"駒沢オリンピック公園","prefecture":"東京都","city":"世田谷区","lat":35.624912,"lng":139.664863,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/komazawa"},
  {"spotSlug":"kokyo","spotName":"皇居","prefecture":"東京都","city":"千代田区","lat":35.677813,"lng":139.756266,"hasShower":false,"hasSentoNearby":true,"dokorunUrl":"https://dokorun.com/spots/kokyo"},
  {"spotSlug":"toneri-park","spotName":"舎人公園","prefecture":"東京都","city":"足立区","lat":35.796536,"lng":139.772497,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/toneri-park"},
  {"spotSlug":"ueno-onshi-park","spotName":"上野恩賜公園","prefecture":"東京都","city":"台東区","lat":35.719944,"lng":139.774475,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/ueno-onshi-park"},
  {"spotSlug":"tamagawa-ryokuchi-marathon","spotName":"多摩川緑地マラソンコース","prefecture":"東京都","city":"大田区","lat":35.540259,"lng":139.704998,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tamagawa-ryokuchi-marathon"},
  {"spotSlug":"heiwa-no-mori-omori-hamabe","spotName":"平和の森公園・大森ふるさとの浜辺公園","prefecture":"東京都","city":"大田区","lat":35.57668,"lng":139.742595,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/heiwa-no-mori-omori-hamabe"},
  {"spotSlug":"tetsugakudo-park","spotName":"哲学堂公園","prefecture":"東京都","city":"中野区","lat":35.721516,"lng":139.67227,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tetsugakudo-park"},
  {"spotSlug":"nogawa-park","spotName":"野川公園","prefecture":"東京都","city":"調布市","lat":35.680421,"lng":139.523606,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/nogawa-park"},
  {"spotSlug":"johoku-chuo-park","spotName":"城北中央公園","prefecture":"東京都","city":"板橋区","lat":35.752739,"lng":139.672208,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/johoku-chuo-park"}
]
```

## 目的地リスト05（11拠点）

```json
[
  {"spotSlug":"ukima-park","spotName":"浮間公園","prefecture":"東京都","city":"板橋区","lat":35.792128,"lng":139.692579,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/ukima-park"},
  {"spotSlug":"keihin-unga-ryokudo","spotName":"京浜運河緑道公園","prefecture":"東京都","city":"品川区","lat":35.598506,"lng":139.745366,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/keihin-unga-ryokudo"},
  {"spotSlug":"oi-futo-chuo-kaihin-park","spotName":"大井ふ頭中央海浜公園","prefecture":"東京都","city":"品川区","lat":35.591852,"lng":139.752412,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/oi-futo-chuo-kaihin-park"},
  {"spotSlug":"fuchu-no-mori-park","spotName":"府中の森公園","prefecture":"東京都","city":"府中市","lat":35.68189,"lng":139.492905,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/fuchu-no-mori-park"},
  {"spotSlug":"fuchu-tamagawa-kazenomichi","spotName":"府中多摩川かぜのみち","prefecture":"東京都","city":"府中市","lat":35.655505,"lng":139.489205,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/fuchu-tamagawa-kazenomichi"},
  {"spotSlug":"musashinomori-park","spotName":"武蔵野の森公園","prefecture":"東京都","city":"府中市","lat":35.676988,"lng":139.524272,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/musashinomori-park"},
  {"spotSlug":"inokashira-park","spotName":"井の頭恩賜公園","prefecture":"東京都","city":"武蔵野市","lat":35.6993,"lng":139.57,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/inokashira-park"},
  {"spotSlug":"arakawa","spotName":"荒川河川敷（赤羽）","prefecture":"東京都","city":"北区","lat":35.779476,"lng":139.719771,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/arakawa"},
  {"spotSlug":"kyu-nakagawa-riverside","spotName":"旧中川沿い","prefecture":"東京都","city":"墨田区","lat":35.703279,"lng":139.834666,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kyu-nakagawa-riverside"},
  {"spotSlug":"sumidagawa-terrace-sumida","spotName":"隅田川テラス（言問橋〜白鬚橋）","prefecture":"東京都","city":"墨田区","lat":35.713811,"lng":139.804187,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/sumidagawa-terrace-sumida"},
  {"spotSlug":"oyokogawa-shinsui-park","spotName":"大横川親水公園","prefecture":"東京都","city":"墨田区","lat":35.703637,"lng":139.808303,"hasShower":false,"hasSentoNearby":true,"dokorunUrl":"https://dokorun.com/spots/oyokogawa-shinsui-park"}
]
```

## 目的地リスト06（11拠点）

```json
[
  {"spotSlug":"rinshi-no-mori-park","spotName":"林試の森公園","prefecture":"東京都","city":"目黒区","lat":35.62393,"lng":139.699811,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/rinshi-no-mori-park"},
  {"spotSlug":"showa-kinen-park","spotName":"国営昭和記念公園","prefecture":"東京都","city":"立川市","lat":35.710328,"lng":139.391051,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/showa-kinen-park"},
  {"spotSlug":"hikarigaoka-park","spotName":"光が丘公園","prefecture":"東京都","city":"練馬区","lat":35.766631,"lng":139.634397,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hikarigaoka-park"},
  {"spotSlug":"shin-yokohama-park","spotName":"新横浜公園","prefecture":"神奈川県","city":"横浜市港北区","lat":35.512539,"lng":139.60324,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shin-yokohama-park"},
  {"spotSlug":"mitsuzawa-park","spotName":"三ツ沢公園","prefecture":"神奈川県","city":"横浜市神奈川区","lat":35.470098,"lng":139.604252,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/mitsuzawa-park"},
  {"spotSlug":"rinko-park","spotName":"臨港パーク","prefecture":"神奈川県","city":"横浜市西区","lat":35.46288,"lng":139.636992,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/rinko-park"},
  {"spotSlug":"kodomo-no-kuni","spotName":"こどもの国","prefecture":"神奈川県","city":"横浜市青葉区","lat":35.560535,"lng":139.488801,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kodomo-no-kuni"},
  {"spotSlug":"negishi-forest-park","spotName":"根岸森林公園","prefecture":"神奈川県","city":"横浜市中区","lat":35.422843,"lng":139.638651,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/negishi-forest-park"},
  {"spotSlug":"mitsuike-park","spotName":"三ツ池公園","prefecture":"神奈川県","city":"横浜市鶴見区","lat":35.524086,"lng":139.66135,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/mitsuike-park"},
  {"spotSlug":"tsuzuki-central-park","spotName":"都筑中央公園","prefecture":"神奈川県","city":"横浜市都筑区","lat":35.546332,"lng":139.571752,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tsuzuki-central-park"},
  {"spotSlug":"tamagawa-marukobashi-furuichiba","spotName":"多摩川河川敷 丸子橋〜古市場","prefecture":"神奈川県","city":"川崎市中原区","lat":35.579498,"lng":139.665917,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tamagawa-marukobashi-furuichiba"}
]
```

## 目的地リスト07（11拠点）

```json
[
  {"spotSlug":"niigata-sports-park","spotName":"新潟県スポーツ公園","prefecture":"新潟県","city":"新潟市中央区","lat":37.883213,"lng":139.059304,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/niigata-sports-park"},
  {"spotSlug":"kansui-park","spotName":"富岩運河環水公園","prefecture":"富山県","city":"富山市","lat":36.7111,"lng":137.2134,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kansui-park"},
  {"spotSlug":"kanazawa-castle-loop","spotName":"金沢城公園外周","prefecture":"石川県","city":"金沢市","lat":36.568494,"lng":136.660773,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kanazawa-castle-loop"},
  {"spotSlug":"kibagata-park","spotName":"木場潟公園","prefecture":"石川県","city":"小松市","lat":36.376622,"lng":136.449349,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kibagata-park"},
  {"spotSlug":"lake-yamanaka-loop","spotName":"山中湖","prefecture":"山梨県","city":"山中湖村","lat":35.414877,"lng":138.896817,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/lake-yamanaka-loop"},
  {"spotSlug":"shinshu-sky-park","spotName":"信州スカイパーク","prefecture":"長野県","city":"松本市","lat":36.158114,"lng":137.922274,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shinshu-sky-park"},
  {"spotSlug":"gifu-memorial-center","spotName":"岐阜メモリアルセンター","prefecture":"岐阜県","city":"岐阜市","lat":35.441552,"lng":136.764983,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/gifu-memorial-center"},
  {"spotSlug":"sunpu-castle-park","spotName":"駿府城公園","prefecture":"静岡県","city":"静岡市葵区","lat":34.977077,"lng":138.385273,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/sunpu-castle-park"},
  {"spotSlug":"sanaruko-park","spotName":"佐鳴湖公園","prefecture":"静岡県","city":"浜松市中央区","lat":34.707123,"lng":137.681776,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/sanaruko-park"},
  {"spotSlug":"tsurumai-park","spotName":"鶴舞公園","prefecture":"愛知県","city":"名古屋市昭和区","lat":35.156228,"lng":136.923,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tsurumai-park"},
  {"spotSlug":"yamazaki-river-kawanabashi-ishikawabashi","spotName":"山崎川四季の道(可和名橋〜石川橋)","prefecture":"愛知県","city":"名古屋市瑞穂区","lat":35.132654,"lng":136.942701,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/yamazaki-river-kawanabashi-ishikawabashi"}
]
```

## 目的地リスト08（10拠点）

```json
[
  {"spotSlug":"shonai-ryokuchi","spotName":"庄内緑地","prefecture":"愛知県","city":"名古屋市西区","lat":35.214088,"lng":136.885732,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shonai-ryokuchi"},
  {"spotSlug":"meijo","spotName":"名城公園","prefecture":"愛知県","city":"名古屋市北区","lat":35.187461,"lng":136.903796,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/meijo"},
  {"spotSlug":"odaka-ryokuchi","spotName":"大高緑地","prefecture":"愛知県","city":"名古屋市緑区","lat":35.048845,"lng":136.948906,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/odaka-ryokuchi"},
  {"spotSlug":"sports-garden-suzuka","spotName":"三重交通G スポーツの杜 鈴鹿","prefecture":"三重県","city":"鈴鹿市","lat":34.886434,"lng":136.59473,"hasShower":false,"hasSentoNearby":true,"dokorunUrl":"https://dokorun.com/spots/sports-garden-suzuka"},
  {"spotSlug":"otsu-kogan-nagisa-park","spotName":"大津湖岸なぎさ公園","prefecture":"滋賀県","city":"大津市","lat":34.997203,"lng":135.902266,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/otsu-kogan-nagisa-park"},
  {"spotSlug":"takaragaike-park","spotName":"宝が池公園","prefecture":"京都府","city":"京都市左京区","lat":35.060767,"lng":135.778585,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/takaragaike-park"},
  {"spotSlug":"kyoto-gyoen","spotName":"京都御苑","prefecture":"京都府","city":"京都市上京区","lat":35.024087,"lng":135.760224,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kyoto-gyoen"},
  {"spotSlug":"kamogawa-sanjo-demachiyanagi","spotName":"鴨川河川敷(三条大橋〜出町柳)","prefecture":"京都府","city":"京都市中京区","lat":35.009499,"lng":135.773946,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/kamogawa-sanjo-demachiyanagi"},
  {"spotSlug":"osakajo","spotName":"大阪城公園","prefecture":"大阪府","city":"大阪市中央区","lat":34.683331,"lng":135.522065,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/osakajo"},
  {"spotSlug":"nagai-park","spotName":"長居公園","prefecture":"大阪府","city":"大阪市東住吉区","lat":34.612588,"lng":135.518489,"hasShower":true,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/nagai-park"}
]
```

## 目的地リスト09（10拠点）

```json
[
  {"spotSlug":"yodogawa-nishinakajima","spotName":"淀川河川公園西中島地区(下流5km折返し)","prefecture":"大阪府","city":"大阪市淀川区","lat":34.726183,"lng":135.488985,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/yodogawa-nishinakajima"},
  {"spotSlug":"hattori-ryokuchi","spotName":"服部緑地","prefecture":"大阪府","city":"豊中市","lat":34.79098,"lng":135.494558,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hattori-ryokuchi"},
  {"spotSlug":"hat-kobe-nagisa-park","spotName":"HAT神戸なぎさ公園","prefecture":"兵庫県","city":"神戸市中央区","lat":34.696514,"lng":135.214981,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hat-kobe-nagisa-park"},
  {"spotSlug":"minato-no-mori-park","spotName":"みなとのもり公園","prefecture":"兵庫県","city":"神戸市中央区","lat":34.687204,"lng":135.200513,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/minato-no-mori-park"},
  {"spotSlug":"akashi-park","spotName":"明石公園","prefecture":"兵庫県","city":"明石市","lat":34.655105,"lng":134.993902,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/akashi-park"},
  {"spotSlug":"heijo-palace-park","spotName":"平城宮跡歴史公園","prefecture":"奈良県","city":"奈良市","lat":34.697709,"lng":135.784839,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/heijo-palace-park"},
  {"spotSlug":"wakayama-castle-park","spotName":"和歌山城公園","prefecture":"和歌山県","city":"和歌山市","lat":34.229433,"lng":135.174469,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/wakayama-castle-park"},
  {"spotSlug":"koyamaike-park","spotName":"湖山池公園","prefecture":"鳥取県","city":"鳥取市","lat":35.518195,"lng":134.184728,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/koyamaike-park"},
  {"spotSlug":"shinji-lake-north-shore","spotName":"宍道湖岸(県立美術館〜松江しんじ湖温泉駅)","prefecture":"島根県","city":"松江市","lat":35.467285,"lng":133.049173,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shinji-lake-north-shore"},
  {"spotSlug":"okayama-sogo-ground","spotName":"岡山県総合グラウンド","prefecture":"岡山県","city":"岡山市北区","lat":34.678425,"lng":133.920868,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/okayama-sogo-ground"}
]
```

## 目的地リスト10（10拠点）

```json
[
  {"spotSlug":"hiroshima-castle-loop","spotName":"広島城外周","prefecture":"広島県","city":"広島市中区","lat":34.403733,"lng":132.458664,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/hiroshima-castle-loop"},
  {"spotSlug":"tokushima-central-park","spotName":"徳島中央公園","prefecture":"徳島県","city":"徳島市","lat":34.075882,"lng":134.55671,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/tokushima-central-park"},
  {"spotSlug":"shiroyama-park-horinouchi","spotName":"城山公園(堀之内)〜松山城周回","prefecture":"愛媛県","city":"松山市","lat":33.848118,"lng":132.762402,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/shiroyama-park-horinouchi"},
  {"spotSlug":"seaside-momochi","spotName":"シーサイドももち海浜公園","prefecture":"福岡県","city":"福岡市早良区","lat":33.594352,"lng":130.346186,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/seaside-momochi"},
  {"spotSlug":"oohori","spotName":"大濠公園","prefecture":"福岡県","city":"福岡市中央区","lat":33.585527,"lng":130.378878,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/oohori"},
  {"spotSlug":"katsuyama-park-murasaki-river","spotName":"勝山公園・紫川河畔","prefecture":"福岡県","city":"北九州市小倉北区","lat":33.887382,"lng":130.87552,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/katsuyama-park-murasaki-river"},
  {"spotSlug":"saga-sunrise-park","spotName":"SAGAサンライズパーク","prefecture":"佐賀県","city":"佐賀市","lat":33.276485,"lng":130.29267,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/saga-sunrise-park"},
  {"spotSlug":"suizenji-ezuko-park","spotName":"水前寺江津湖公園","prefecture":"熊本県","city":"熊本市東区","lat":32.768064,"lng":130.757235,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/suizenji-ezuko-park"},
  {"spotSlug":"oita-sports-park-happy-road","spotName":"大分スポーツ公園 ハッピーロード","prefecture":"大分県","city":"大分市","lat":33.213704,"lng":131.707654,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/oita-sports-park-happy-road"},
  {"spotSlug":"okinawa-athletic-park","spotName":"沖縄県総合運動公園","prefecture":"沖縄県","city":"沖縄市","lat":26.315795,"lng":127.817107,"hasShower":false,"hasSentoNearby":false,"dokorunUrl":"https://dokorun.com/spots/okinawa-athletic-park"}
]
```
