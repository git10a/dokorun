# 軽量化とNext 16.3.8更新

2026-10-15、503対策（`release-2026-10-15-worker-cpu-isr.md`）の続きとして2回配信した。どちらもmainから、配信ガード `scripts/check-release-base.mjs` を通して配信した。

## 1. /login・/spots のプリフェッチ停止と、未ログイン viewer-state の軽量化

- 12:33 JST 本番100%。Worker `1d4b60de-e63c-49e6-afe6-4ded599da2ee`、tag `79fa6594be6d`（main `79fa659` = `884adc6` のマージ）。
- 直前に、新潟シティマラソン（`64b7a32`）をmainへ取り込んだ（`d1df5ec`）。mainの作業ツリーに残っていた同じ内容の未コミット16ファイルは、scratchpadへ退避してから片付けた。
- 0%でsmoke 5周が通り、未ログインの `viewer-state` が `{"loggedIn":false,...}` を返すことと、`get-session` が `null` を返すことを確認した。10%（2分）を経て100%にし、smoke 5周が通った。gzip 3052.08KiB。
- 配信後20分（260件）: すべて `ok`、`exceededCpu` 0件。

## 2. Next 16.3.8・@opennextjs/cloudflare 1.20.11・wrangler 4.151

- 13:01 JST 本番100%。Worker `fbe4d261-9293-458b-8a7a-b7cce263fa07`、tag `04fd213b7a8f`（main `04fd213` = `0aa2a10` のマージ）。
- @opennextjs/aws 4.1.10 で、`/` がキャッシュの横取りに当たるようになった（調査文書のC3）。Workerは gzip 3052→2859.78KiB。
- テスト203件と型チェックが通った。ビルド結果の再生成の設定は変わらない（`/`・`/races` は86400、ほかの静的ページは `false`）。
- 0%でsmoke 5周が通り、`/`・そのRSCプリフェッチ・`/races`・スポット・新潟・エリア・sitemapがすべて `x-opennext-cache: HIT` を返した。Google認可URLの発行は旧版と同一だった。10%（5分、新版8件すべてok）を経て100%にし、smoke 5周が通った。
- 配信後15分（158件）: すべて `ok`、`exceededCpu` 0件。`GET /` はCPU 12ms（更新前は温まった状態で33ms）、`/` のプリフェッチは7ms（同22ms）。
- 段階配信中は、旧版のページを開いたままの閲覧者が旧ビルドのJSチャンクを要求し、新版のWorkerに回る（コールドスタートで400〜970ms CPU、outcomeはok）。100%後は、ページを再読み込みすれば解消する。

## 3. Workerサイズ削減（誤った判断でロールバック。Codexの版で置き換え）

- `5b01112`（main `9f40fcf`）。Worker `5c58c377-14f2-4ce3-b177-3def813457f0`（gzip 2143.58KiB）。0%でsmoke 5周、主要ページ、Googleログインの入口は通った。13:55 JSTに10%（2分）を経て100%にし、smoke 5周も通った。
- 100%にしたあとの確認で、アプリ内ブラウザに大会ページのコース地図が空白で表示された。スポット詳細と一覧の地図は出ていたため、退行と判断し、13:59 JSTに `fbe4d261` へロールバックした。
- **この判断は誤りだった。** アプリ内ブラウザのペインが隠れていると `requestAnimationFrame` が止まり、MapLibreが描画を終えない。14:35 JSTに、正常な `fbe4d261` でも、ペインが隠れた状態（`requestAnimationFrame` が発火しない）では大会の地図が同じく空白になることを確かめた。ヘッドレスChromeでは、サイズ削減のビルドで大会・スポット詳細・一覧の地図15件がすべて描けた（サイズ削減セッションによる確認）。
- mainでは `90dc7ee` で、地図の読み込み・next.config・認証クライアントの6ファイルを `fbe4d261` の状態に戻した。これを取り消して再適用したのが `fec837e`（ブランチ `perf/reapply-worker-shrink`、gzip 2143.75KiB）で、再配信待ち。
- その後、別の作業（Codex）が同じ方向の削減（`4327935`）を行い、17:09 JSTに `c4b657eb`（gzip 1,989.08KiB）を本番100%にした（`release-2026-10-15-worker-resource-optimization.md`）。再適用版 `fec837e`（2143.75KiB）は、これと衝突し、サイズでも劣るため、配信せずに取り下げた。
- 教訓: 地図の目視確認は、ペインが表示されていること（`requestAnimationFrame` が発火すること）を確かめてから行う。確実なのは、ヘッドレスChromeで描画の完了を待つ方法。
- 切り替えの前後数分は、ブラウザに残った先読みの応答が、別ビルドのJSチャンクを参照して404になる。画面内の遷移は正常に動いた。

## 補足

- mainの作業ツリーの `node_modules` は、Next更新の前のまま。そこでビルドや開発サーバーを使う前に `npm ci` が要る。
