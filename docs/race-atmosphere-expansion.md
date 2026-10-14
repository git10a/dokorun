# 全大会へのコース予習画像の展開

作業開始: 2026-10-14。本番公開は未実施。

東京レガシーハーフの共通表示を使い、各大会の予習ポイントに現地確認したAI生成の参考画像を対応付ける。距離バッジから地図へ移動し、バッジ同士を点線で結ぶ。画像の下の右端に小さく「実際の景色を見る」を置き、方向のキャプションは表示しない。

## 進捗の確認

対象は現時点で93大会。既存の予習原稿は85大会194地点。完了数は固定値で扱わず、次の監査で再計算する。

```sh
node --import tsx scripts/audit-race-atmosphere.ts
```

`output/race-atmosphere/expansion-plan.json` に全大会と地点の状態を保存する。`ready` は全予習ポイントに画像があり、掲載コース年も一致している状態。`needs-images` と `needs-editorial` は未完了であり、共通UIの存在だけで対応済みに数えない。

この監査が作る緯度経度と向きは調査候補にすぎない。橋の下、反対車線、別の堤防、折り返し前後などへ案内されることがあるため、そのまま生成・掲載してはいけない。

## 追加の手順

1. 原稿の距離範囲と掲載ルートを照合し、説明に対応する地点を選ぶ。上り・橋は範囲の中点ではなく、実際に地形が分かる位置を選ぶ。
2. ストリートビューを開いて道路・左右の景色・撮影日・向きを目視確認する。適切な画像がない場合は未確認のまま残し、公式の写真やコース資料で補足調査する。
3. 観察内容を基に画像を生成し、左右の水辺や地形、道路の高さなどを照合する。現地写真としては扱わない。
4. `output/race-atmosphere/*-sources-and-prompts.json` に観察、パノラマID、撮影日、プロンプト、生成ファイルのパス、確認結果を保存する。
5. `generatedPath` と `visualReview` を入れた制作記録だけを取り込む。

```sh
node --import tsx scripts/import-race-atmosphere.ts output/race-atmosphere/REVIEWED-sources-and-prompts.json
```

取込処理は画像を1280×720 WebPにし、`src/lib/race-atmosphere-scenes.json` と `src/lib/race-preparation.json` の明示的な `sceneId` を更新する。地図の座標は掲載高低図と同じ距離軸で補間する。同じIDの再取込は置換となる。確認済み原本PNGは `output/race-atmosphere/` に残す。

### コース年と追加調査の扱い

掲載コース年が不明の場合は `courseYear: null` とし、年を推測しない。画像は掲載コース年が同じ場合だけ表示する。不明同士の場合は「掲載コースの景色」と表示し、後から年が確定した時点で再確認するまで非表示になる。

原稿の追加・修正で新しく調査した根拠は `data/race-preparation-research/2026-10-15.json` に保存する。以前の調査記録を過去の日付のまま書き換えず、テストは大会ごとの最新記録を照合する。

### 360度写真のリンク

Google投稿者のパノラマは Maps API の `pano` 引数だけでは指定した写真が開かない場合がある。実際に確認した `data=!3m4!1e1!3m2!1sPANORAMA_ID!2e10` 形式の直接リンクを `referenceUrl` に保持する。座標を追加しただけの代替URLは別の写真を選ぶ場合があるため使わない。取込処理は明示した `referenceUrl` を維持する。

近隣の浜辺や堤防上からの眺めを使った場合は `sourceNotes` と画像の代替テキストに撮影位置を残し、当日の走行レーンや正確な勾配を示す画像として扱わない。

## 検査

`tests/race-atmosphere.test.tsx` は追加大会の全地点に実ファイルがあり、掲載年の制約、地図位置、画像とリンク数、地点間の線の数が一致することを検査する。1地点だけの大会は線が0本となる。

```sh
node node_modules/vitest/vitest.mjs run tests/race-atmosphere.test.tsx tests/race-preparation.test.tsx tests/race-page-seo.test.tsx
node node_modules/typescript/bin/tsc --noEmit
```

表示確認は localhost:3027 で行う。本番への反映とは別の確認である。

## 要追加調査

- 淀川市民の31km候補は「ここにはストリートビュー画像がありません」。20km付近は川側の公園道を確認済みだが、2地点が揃うまでは未取込。
- 下関海響の21km・28.6kmの初期候補はストリートビューなし。別の資料から対応区間を確認する。
- 金沢など原稿がない8大会は、既存85大会の調査日・資料を流用せず、追加の出典確認と原稿作成が必要。
- 参照画像が古い地点は制作記録に撮影年月を残す。現在の建物・路面・当日の季節を保証する画像として扱わない。
