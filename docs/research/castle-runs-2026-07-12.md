# お城ラン追加調査・掲載記録（2026-07-12）

## 方針

- Runtripの既存リサーチは人気・利用実態とルート特定のヒントに限って使い、文章・画像・ルートデータは転用しない。
- BRouterまたはOSMの道路・園路データから代表コースを自前生成する。
- `data/gpx/<slug>.gpx` にGPXを保存し、距離・周回判定とコース画像を確認したものだけ公開する。
- 城内の有料見学路ではなく、一般に通行できる公園園路・歩道・城郭外周を基本とする。

## 結果

| # | slug | コース | 距離 | 状態 | QCメモ |
| ---: | --- | --- | ---: | --- | --- |
| 1 | himeji-castle-loop | 姫路城外周 | 5.34km | done | 城郭・公園群を大きく囲む周回 |
| 2 | matsumoto-castle-loop | 松本城外周 | 2.87km | done | 外堀と城西・城北の街路を囲む周回 |
| 3 | okayama-castle-korakuen | 岡山城・後楽園周回 | 5.38km | done | 旭川の橋を使い岡山城と後楽園を結ぶ周回 |
| 4 | hikone-castle-loop | 彦根城外周 | 4.85km | done | 堀と城下町を囲む周回 |
| 5 | matsue-castle-loop | 松江城外周 | 3.95km | done | 堀川・塩見縄手側を含む周回 |
| 6 | kochi-castle-loop | 高知城外周 | 2.88km | done | 城山を囲む市街地周回へ再調整 |
| 7 | kumamoto-castle-loop | 熊本城外周 | 5.05km | done | 二の丸・城彩苑側を含む周回 |
| 8 | takaoka-castle-park | 高岡古城公園周回 | 2.69km | done | 水濠と公園外周を囲む形へ再調整 |
| 9 | tsurugajo-loop | 鶴ヶ城外周 | 4.07km | done | 城郭を自然に囲む周回 |
| 10 | fukuyama-castle-loop | 福山城外周 | 2.48km | done | 福山駅北側の城郭外周 |
| 11 | toyama-castle-park | 富山城址公園周回 | 3.20km | done | 松川・県庁前公園を含む周回 |
| 12 | goryokaku-loop | 五稜郭外周 | 2.64km | review | OSM園路抽出が西側道路網へ誤接続。公開しない |
| 13 | odawara-castle-loop | 小田原城外周 | 3.95km | review | BRouterが城址公園西側へ大きく迂回。公開しない |

## 調査で確認した主な未掲載候補

Runtripリサーチには、上記のほか首里城、唐津城、仙台城、姫路城、松本城、岡山城、彦根城、松江城、熊本城、高知城、高岡城、鶴ヶ城、小田原城、福山城などを目的地にした投稿が複数ある。今回は城郭外周を自然な周回として再現でき、既存掲載とコース内容が重複しない11件を採用した。

首里城・仙台城・唐津城など、駅や市街地からの観光ランとして距離が長くなる候補は、城郭外周とは別の「旅ランコース」として経由地を再調査する。五稜郭と小田原城は実走GPX、Stravaルート、または歩道接続を正確に指定した手動トレースが得られるまで公開しない。

## 出典・照合先

- 姫路市「姫路城景観周遊マップ」: https://www.city.himeji.lg.jp/sangyo/0000007085.html
- 松本市「松本城の観覧案内」: https://www.city.matsumoto.nagano.jp/soshiki/135/4118.html
- 岡山市「てくてくロード 岡山城ルート」: https://www.city.okayama.jp/shisei/0000059325.html
- 自前収集済みRuntrip人気リサーチ: `data/research/runtrip-popular.json`
- 経路生成: BRouter / OpenStreetMap

## 第2バッチ: お城マラソン認定大会一覧からの候補拡張

Sportsnet ID「お城マラソン」認定大会一覧（2026-07-02更新）を、ランニング対象になっている城の候補発見に利用した。サイトの文章・画像・大会コースは転用せず、自治体の公園・ウォーキング情報と自前収集済みRuntripリサーチを照合し、GPXはBRouterから自前生成した。

| slug | コース | 距離 | 状態 | QCメモ |
| --- | --- | ---: | --- | --- |
| marugame-castle-loop | 丸亀城周回 | 3.48km | done | 丸亀市公式の丸亀城ウォーキングコースも確認 |
| hamamatsu-castle-park | 浜松城公園周回 | 3.17km | done | 浜松市公式ウォーキングコース・距離表示あり |
| inuyama-castle-kisogawa | 犬山城・木曽川周回 | 5.98km | done | 市公式の城下町・木曽川河畔コースを接続 |
| ueda-castle-park | 上田城跡公園周回 | 3.94km | done | 市公式の城内・城下町散策情報を確認 |
| fukui-castle-loop | 福井城址周回 | 3.43km | done | 城址と福井駅周辺を囲む市街地周回 |
| takada-castle-park | 高田城址公園周回 | 4.28km | done | 堀と公園外周を自然に囲む周回 |
| nijo-castle-loop | 二条城外周 | 3.82km | done | 堀沿いと外周街路を囲む周回 |
| shuri-castle-loop | 首里城周回 | 4.73km | done | 首里城・龍潭・城下町を囲む坂道周回 |
| tottori-castle-kyusho-park | 鳥取城跡・久松山周回 | 7.74km | review | 山中で枝線が複数入り代表コースとして未確定。公開しない |
| karatsu-castle-loop | 唐津城周回 | 6.23km | review | 橋の先に不自然な小周回と折返し。公開しない |

候補出典: https://sportsnet-id.jp/shiro/event
