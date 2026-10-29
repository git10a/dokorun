# 大会・スポットの所在地表示（2026-10-15）

## 表示方針

- 大会・スポット名の近くに「都道府県 市区町村」を表示する。都府県の末尾を省略しない。
- 大会の `city` は主会場（原則スタート側）の市区町村。通過する全自治体を表すものではない。
- 政令指定都市は市まで、東京23区・町・村は自治体名を表示する。
- スポットは既存の `prefecture` / `city` を使用する。
- 大会検索候補にも所在地を表示し、市区町村名でも検索できる。

## 大会の市区町村の照合

掲載済み参考コースの `race-courses.json` の開始座標を国土地理院の公開逆ジオコーダーに照会し、[市区町村コード表](https://maps.gsi.go.jp/js/muni.js)で名称を取得。結果を既存の主会場名と照合した。座標は参考コース由来であるため、公式の会場案内と食い違う2件は公式案内を優先した。

- 大阪・淀川市民マラソン：参考コース開始座標の照会結果は大阪市旭区。公式開催概要が会場を大阪府守口市外島町としているため、守口市を採用。
- 世田谷246ハーフマラソン：参考コース開始座標の照会結果は目黒区。公式案内の駒沢陸上競技場を主会場とする世田谷区の大会として、世田谷区を採用。

照会日：2026-10-15。開催日やコースの正確さを新たに保証する照合ではない。

| 大会 slug | 表示する所在地 | 照合元 |
|---|---|---|
| himeji-castle-marathon | 兵庫県 姫路市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.83466&lon=134.69193) |
| katsuta-marathon | 茨城県 ひたちなか市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.38778&lon=140.52728) |
| niigata-city-marathon | 新潟県 新潟市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=37.88026&lon=139.0574) |
| kitakyushu-marathon | 福岡県 北九州市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.88287&lon=130.8738) |
| ehime-marathon | 愛媛県 松山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.84099&lon=132.7668) |
| saitama-marathon | 埼玉県 さいたま市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.89363&lon=139.63005) |
| beppu-oita-marathon | 大分県 大分市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.25827&lon=131.53528) |
| kyoto-marathon | 京都府 京都市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.99589&lon=135.7151) |
| tokyo-marathon | 東京都 新宿区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.68994&lon=139.69234) |
| nagoya-womens-marathon | 愛知県 名古屋市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.1867&lon=136.94593) |
| itabashi-city-marathon | 東京都 板橋区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.7964&lon=139.68228) |
| hokkaido-marathon | 北海道 札幌市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=43.06&lon=141.35215) |
| yokohama-marathon | 神奈川県 横浜市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.45453&lon=139.63035) |
| mito-komon-marathon | 茨城県 水戸市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.37612&lon=140.47021) |
| suwako-marathon | 長野県 諏訪市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.04035&lon=138.10385) |
| fukuoka-marathon | 福岡県 福岡市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.59076&lon=130.39905) |
| shimonoseki-kaikyo-marathon | 山口県 下関市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.9504&lon=130.92946) |
| ibigawa-marathon | 岐阜県 揖斐川町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.48904&lon=136.56781) |
| kobe-marathon | 兵庫県 神戸市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.69038&lon=135.19589) |
| fujisan-marathon | 山梨県 富士河口湖町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.50372&lon=138.76876) |
| naha-marathon | 沖縄県 那覇市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=26.2092&lon=127.67475) |
| okayama-marathon | 岡山県 岡山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.67745&lon=133.92111) |
| tsukuba-marathon | 茨城県 つくば市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.08778&lon=140.08254) |
| osaka-yodogawa-shimin-marathon | 大阪府 守口市 | [大会公式](https://www.osaka42195.com/event/outline/) |
| koedo-kawagoe-half-marathon | 埼玉県 川越市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.9128&lon=139.45401) |
| yokosuka-seaside-marathon | 神奈川県 横須賀市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.27965&lon=139.67744) |
| shonan-international-marathon | 神奈川県 大磯町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.30253&lon=139.29291) |
| mie-matsusaka-marathon | 三重県 松阪市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.57801&lon=136.52019) |
| tendo-la-france-marathon | 山形県 天童市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=38.33583&lon=140.37897) |
| natori-seaside-marathon | 宮城県 名取市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=38.16889&lon=140.95698) |
| yoron-marathon | 鹿児島県 与論町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=27.04817&lon=128.41382) |
| ogaki-marathon | 岐阜県 大垣市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.36317&lon=136.61727) |
| sanda-masters-marathon | 兵庫県 三田市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.88973&lon=135.21906) |
| toyama-marathon | 富山県 高岡市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.75305&lon=137.02455) |
| minato-city-half-marathon | 東京都 港区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.65504&lon=139.74993) |
| ogawa-washi-marathon | 埼玉県 小川町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.05283&lon=139.281) |
| fukuyama-yearend-marathon | 広島県 福山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.46646&lon=133.36556) |
| shimada-oigawa-marathon | 静岡県 島田市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.83562&lon=138.17782) |
| fukuchiyama-marathon | 京都府 福知山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.31286&lon=135.13446) |
| kawaguchi-marathon | 埼玉県 川口市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.82255&lon=139.71324) |
| teganuma-eco-marathon | 千葉県 柏市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.86981&lon=139.99031) |
| setagaya-246-half-marathon | 東京都 世田谷区 | [大会公式](https://www.se-sports.or.jp/event/setagaya246/) |
| kasama-half-marathon | 茨城県 笠間市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.37463&lon=140.26089) |
| aino-tsuchiyama-marathon | 滋賀県 甲賀市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.93448&lon=136.29343) |
| ageo-city-half-marathon | 埼玉県 上尾市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.97026&lon=139.60018) |
| matsue-castle-marathon | 島根県 松江市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.47333&lon=133.06801) |
| tokyo-legacy-half-marathon | 東京都 新宿区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.6774&lon=139.71405) |
| gunma-marathon | 群馬県 前橋市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.4112&lon=139.05561) |
| ibusuki-nanohana-marathon | 鹿児島県 指宿市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=31.25543&lon=130.6483) |
| tokyo-newyear-half-marathon | 東京都 北区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.78865&lon=139.71957) |
| tokyo-akabane-half-marathon | 東京都 北区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.78865&lon=139.71957) |
| shonan-fujisawa-marathon | 神奈川県 藤沢市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.30224&lon=139.48171) |
| osaka-international-womens-marathon | 大阪府 大阪市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.61407&lon=135.5182) |
| tateyama-wakashio-marathon | 千葉県 館山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.01229&lon=139.86003) |
| kanagawa-marathon | 神奈川県 横浜市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.40056&lon=139.61971) |
| moriya-half-marathon | 茨城県 守谷市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.95235&lon=139.97583) |
| kagawa-marugame-half-marathon | 香川県 丸亀市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.26045&lon=133.78624) |
| southern-seto-oshima-road-race | 山口県 周防大島町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.90328&lon=132.34103) |
| hamamatsu-city-marathon | 静岡県 浜松市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.71009&lon=137.72611) |
| kiryu-hori-marathon | 群馬県 桐生市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.40887&lon=139.33336) |
| nobeoka-nishinihon-marathon | 宮崎県 延岡市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=32.58257&lon=131.6651) |
| kochi-ryoma-marathon | 高知県 高知市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.55828&lon=133.53263) |
| fukaya-city-half-marathon | 埼玉県 深谷市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.17703&lon=139.27747) |
| inuyama-half-marathon | 愛知県 犬山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.38553&lon=136.94395) |
| kagoshima-marathon | 鹿児島県 鹿児島市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=31.59338&lon=130.56134) |
| miura-kokusai-marathon | 神奈川県 三浦市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.18233&lon=139.65424) |
| nagoya-city-marathon | 愛知県 名古屋市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.1867&lon=136.94593) |
| kagawa-marathon | 香川県 高松市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.35444&lon=134.0456) |
| saga-sakura-marathon | 佐賀県 佐賀市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.27599&lon=130.29287) |
| fukui-sakura-marathon | 福井県 福井市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.06267&lon=136.2181) |
| aomori-sakura-marathon | 青森県 青森市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=40.84843&lon=140.68084) |
| gifu-seiryu-half-marathon | 岐阜県 岐阜市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.44313&lon=136.76561) |
| ishioka-tsukubane-half-marathon | 茨城県 石岡市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.19361&lon=140.27416) |
| nagano-marathon | 長野県 長野市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.6597&lon=138.23102) |
| nagasaki-bayside-marathon | 長崎県 長崎市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=32.7412&lon=129.8679) |
| izu-oshima-marathon | 東京都 大島町 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.75207&lon=139.35287) |
| ako-gishi-marathon | 兵庫県 赤穂市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.73049&lon=134.39709) |
| iioka-shiosai-marathon | 千葉県 旭市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.70248&lon=140.71149) |
| asuka-half-marathon | 奈良県 明日香村 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.45163&lon=135.80454) |
| uonuma-koshihikari-marathon | 新潟県 魚沼市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=37.23594&lon=138.99068) |
| shizuoka-marathon | 静岡県 静岡市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.97632&lon=138.38181) |
| fuchu-tamagawa-marathon | 東京都 府中市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.6543&lon=139.4757) |
| togane-kujukuri-half-marathon | 千葉県 東金市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.5461&lon=140.39021) |
| tokushima-marathon | 徳島県 徳島市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.081&lon=134.55159) |
| makomanai-marathon | 北海道 札幌市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=42.9969&lon=141.34375) |
| aoshima-taiheiyo-marathon | 宮崎県 宮崎市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=31.83157&lon=131.44655) |
| yukuhashi-seaside-half-marathon | 福岡県 行橋市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=33.73659&lon=131.01246) |
| shinjuku-city-half-marathon | 東京都 新宿区 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.6776&lon=139.71399) |
| ohtawara-marathon | 栃木県 大田原市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.86071&lon=140.00489) |
| osaka-shinshun-marathon | 大阪府 堺市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.56254&lon=135.5301) |
| wakayama-jazz-marathon | 和歌山県 和歌山市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.22987&lon=135.1722) |
| nagoya-adventure-marathon | 愛知県 名古屋市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=35.21102&lon=136.88228) |
| soja-kibiji-marathon | 岡山県 総社市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=34.66882&lon=133.75106) |
| kumamoto-castle-marathon | 熊本県 熊本市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=32.80371&lon=130.70988) |
| kanazawa-marathon | 石川県 金沢市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=36.56182&lon=136.65768) |
| tamana-idaten-marathon | 熊本県 玉名市 | [国土地理院](https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=32.87671&lon=130.55471) |

## ローカル検証

- 既存テスト4ファイル・24件成功（race-schedule / race-page-seo / race-courses / spot-search）。
- 対象8ファイルの ESLint と `git diff --check` 成功。
- アプリ本体の TypeScript チェック成功（既存の作業用 `output/`・`tmp/` を除外した一時設定）。通常の全体チェックは、着手前から存在する `output/race-atmosphere-release-2026-10-15/verify-live.ts` の HeadersInit / unknown 型エラーで失敗する。
- ブラウザで大会一覧・詳細、トップのスポットカード、大会詳細内のスポットを確認。390px / 1280px 幅の表示で確認した所在地は省略されず、ページの横はみ出しなし。
- 「ひたちなか市」で勝田全国マラソンが候補に出て、詳細にも「茨城県 ひたちなか市」が表示されることを確認。
- スポットの表示確認には既存のローカルDBスナップショットのコピーを使用。本番への公開・DB変更は実施していない。
