# ChatGPT Deep Research 用プロンプト(スポットデータ収集)

以下をそのままChatGPT(Deep Research)に貼り付ける。`【】` の3箇所を書き換えること。
除外リストは `npm run db:exclusions` でDBから最新の登録済み一覧を出力して貼る。
複数回に分けて実行する場合は、前の回で得たスポット名も除外リストに追記してから次を実行する(そうしないと回をまたいで重複する)。
出力されたJSONは `data/` に保存して `npm run db:import -- data/xxx.json --dry-run` で検証 → 問題なければ `--dry-run` を外して投入する。

---

あなたは日本のランニングコース情報を調査するリサーチャーです。
**【対象エリア: 例「関東地方」】** で、ランナーに広く知られている実在のランニングスポットを **【件数: 例「30件」】** 調査し、指定のJSON形式で出力してください。

## スポットの選定基準

- 「走りに行く目的地」として定着している場所(公園の周回コース、河川敷、湖畔、城公園、競技場周辺など)
- 地元ランナーの定番、駅伝・マラソン練習地、ランニングステーションが近い場所を優先
- 実在が複数の情報源で確認できるもののみ。確認できない場所は含めない
- 以下は登録済みのため除外(同じ場所の別名・公園内の別コースも不可。河川敷のみ、起点が明確に離れた別区間なら可):
  **【ここに `npm run db:exclusions` の出力を貼る】**

## 調査ルール(重要)

- 距離・設備・照明などの事実情報は、自治体・公園公式サイト、ランニング専門メディアなど複数の情報源で裏取りすること
- **確認できなかった項目は推測せず null にする**(特に elevationGainM、signalsCount、nightLighting)
- 緯度経度はコースのスタート地点として使える場所(公園入口など)を小数点以下4桁以上で
- description は調査した事実に基づき、です・ます調で180〜250字。コースの特徴(距離、路面、雰囲気)と、どんな練習に向くかを含める

## 出力形式

JSON配列のみをコードブロックで出力してください(前置き・解説は不要)。各要素は次の形式です。

```json
{
  "slug": "yamashita-koen",
  "name": "山下公園・みなとみらい",
  "nameKana": "やましたこうえん・みなとみらい",
  "prefecture": "神奈川県",
  "city": "横浜市中区",
  "lat": 35.4437,
  "lng": 139.6503,
  "description": "180〜250字の紹介文。",
  "access": "みなとみらい線 元町・中華街駅から徒歩3分。",
  "nightLighting": "bright",
  "tags": ["waterside", "scenic", "flat"],
  "facilities": {
    "hasToilet": true,
    "hasWaterFountain": false,
    "hasVendingMachine": true,
    "hasLocker": false,
    "hasShower": false,
    "hasSentoNearby": false,
    "hasParking": false,
    "hasConvenienceStore": true
  },
  "course": {
    "distanceM": 5000,
    "courseType": "loop",
    "surface": "asphalt",
    "elevationGainM": 10,
    "signalsCount": null
  }
}
```

## 各フィールドの制約

| フィールド | 制約 |
|---|---|
| slug | 半角小文字英数字とハイフンのみ。ローマ字で一意に(例: `oyokogawa-shinsui-koen`) |
| prefecture | 都道府県の正式名称(「東京都」「大阪府」「北海道」など) |
| nightLighting | `"bright"`(夜も明るい) / `"partial"`(一部照明) / `"dark"`(夜は暗い) / null(不明) |
| tags | 次の16種のslugのみ使用可: `no-signals`(信号ゼロ), `flat`(フラット), `hilly`(坂練向き), `dirt-path`(土の路面), `dedicated-lane`(ラン専用レーンあり), `track`(トラックあり), `cross-country`(クロカンコース), `bright-at-night`(夜も明るい), `shaded`(木陰が多い), `less-crowded`(混みにくい), `water-refill`(給水しやすい), `waterside`(湖畔・水辺), `riverside`(河川敷), `park`(公園), `scenic`(景色が良い), `cherry-blossoms`(桜の名所) |
| facilities | 8項目すべて true / false で。不明なら false |
| course.distanceM | 代表コース1周(往復コースは往復合計)の距離をメートル整数で |
| course.courseType | `"loop"`(周回) / `"out_and_back"`(往復) / `"one_way"`(ワンウェイ) / `"track"`(トラック) |
| course.surface | `"asphalt"`(舗装) / `"dirt"`(土) / `"track"`(全天候トラック) / `"trail"`(トレイル) / `"mixed"`(混合) |
| course.elevationGainM | 1周あたりの獲得標高(整数m)。不明なら null |
| course.signalsCount | コース上の信号数(整数)。不明なら null |

## 出力前のセルフチェック

- [ ] JSONとして構文が正しい(配列、すべてダブルクォート、末尾カンマなし)
- [ ] slugがファイル内で重複していない
- [ ] tagsに指定の16 slug以外を使っていない
- [ ] 事実確認できなかった数値を推測で埋めていない
