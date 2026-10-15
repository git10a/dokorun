# 間欠的503（exceededResources）調査 2026-10-15

対象: `dokorun` Worker（無料プラン / @opennextjs/cloudflare 1.20.1（内部は @opennextjs/aws 4.0.2）/ Next 16.2.10 / 版 `a3060f4e`）
方針: 有料プランは最終手段。コード側の対策をやり切っても上限を超える根拠（重いURLとそのCPU実測値）が示せたときだけ検討する。

## 結論

**503の主因は、無料プランでISRの再生成が10msのCPU上限に収まらず失敗し続けていること**。

- 503の正体は Worker の `exceededResources`（エラー1102）で、実測では **すべて `exceededCpu`**。メモリ超過は観測されていない。
- 25分の実測で `exceededCpu` は80件。**80件すべてがISRの再生成リクエスト**（`HEAD /spots/[x]` 45件、`HEAD /races/[x]` 35件）で、閲覧者のGETで超過したものは0件だった。
- 再生成は成功した26件でもCPUが中央値94ms・p90で269msかかる。上限10msの約10〜27倍で、無料プランでは原理的に収まらない。
- 再生成が失敗するとキャッシュは期限切れ（STALE）のまま残るので、次の閲覧やプリフェッチのたびにまた再生成が投げられる。25分で **398回**（同じページが最大25回）、成功は26回（7%）だけだった。全呼び出し1,070件のうち37%がこの空回りにあたる。
- 再生成は自己参照のservice binding経由で、閲覧者と同じisolateで走りやすい。そこでCPU超過が起きてisolateが落ちると、同時に処理中だった閲覧者のリクエストも503になる。GraphQLで見えた「1人の閲覧者の複数ページが1分以内にまとめて落ちる」バーストは、これで説明できる。
- 10/12から10/14にかけてエラー率が0.30%→0.70%と上がったのは、レースページの追加と内容の充実で、再生成の対象と1回あたりの描画量が増えたためと考えられる。

## 計測方法

1. Cloudflare GraphQL（2026-10-12 09:00〜10-15 09:40 JST）
   - アカウント: `workersInvocationsAdaptive`（status別・時間別、CPU分位）
   - ゾーン: `httpRequestsAdaptiveGroups`（`edgeResponseStatus >= 500`、パス別・分別。サンプリングされた推計値）
2. `wrangler tail --format json` の受動収集（2026-10-15 09:39〜10:25 JST、1,070件）と、自分で叩いた温まった状態の計測（46件）
   - 保存したのは時刻・outcome・CPU・壁時計時間・メソッド・パス・RSC/プリフェッチのヘッダー有無だけ。IP・UA・クエリ・cookieは保存していない。
   - tailはリアルタイムに流れるだけなので、Observabilityの設定（`invocation_logs: false`、クエリのマスク）は変えていない。

## GraphQL: 過去3日の件数

| 日 (JST) | Worker呼び出し | success | clientDisconnected | exceededResources | 率 |
|---|---:|---:|---:|---:|---:|
| 10/12 | 37,489 | 36,962 | 413 | 114 | 0.30% |
| 10/13 | 32,894 | 32,098 | 638 | 158 | 0.48% |
| 10/14 | 31,306 | 30,506 | 582 | 218 | 0.70% |
| 10/15（〜09:40） | 6,128 | 5,996 | 131 | 1 | 0.02% |

`exceededResources` が多かった時間帯（JST）は、10/12の18〜21時（91件）、10/13の11〜12時（33件）、10/13の23時（90件。US発のUA不明な巡回が全ページを回った時間）、10/14の11時（34件）、10/14の13〜22時（177件）。夕方から夜に集中しており、閲覧が多い時間ほど、期限切れページの再生成も多く投げられる。

閲覧者が受け取った5xx（ゾーン側の推計、3日合計で491件、うち503が463件）のパス別内訳:

| 件数 | ルート |
|---:|---|
| 155 | `GET /spots/[slug]` |
| 53 | `POST /api/track` |
| 46 | `GET /races/[slug]` |
| 44 | `GET /api/auth/get-session` |
| 26 | `GET /api/races/[slug]/reviews`（※DBエラー時はアプリ自身が503を返す実装。一部はリソース超過と別の可能性あり） |
| 25 | `GET /` |
| 16 / 15 / 14 / 10 | `/spots`・`/login`・`/contact`・`/races` |

バーストの例: 10/14 11:16（MobileSafari）に `/api/track` 16件と、`/spots/wangan-ariake-kasai`・`yamanote-loop`・`tokyo-metropolitan-gymnasium-track` が同じ分にまとめて503。10/13 12:07（Edge）は5スポットと `/api/track`。

## 実測: ルート別のCPU（ms）

受動収集1,070件。「温」は300ms未満（コールドスタートを除いたもの）の中央値。

| ルート | 件数 | p50 | p90 | 温p50 | 10ms超 | 備考 |
|---|---:|---:|---:|---:|---:|---|
| `HEAD /spots/[x]`（再生成） | 196 | 8 | 89 | 8 | 56 | 成功しても約100ms。キャンセル130件、CPU超過45件 |
| `HEAD /races/[x]`（再生成） | 202 | 7 | 13 | 7 | 32 | キャンセル162件、CPU超過35件 |
| `GET /api/auth/get-session` | 23 | 23 | 561 | 19 | 23 | 未ログインでも毎回 `betterAuth()` を組み立てる。全ページビューで1回呼ばれる |
| `GET /` | 13 | 104 | 487 | 33 | 13 | キャッシュの横取りに当たらない（後述） |
| `GET /` プリフェッチ | 9 | 22 | 376 | 22 | 8 | 同上 |
| `GET /spots` プリフェッチ | 10 | 437 | 837 | 112 | 10 | force-dynamic |
| `GET /login` プリフェッチ | 11 | 135 | 581 | 133 | 11 | force-dynamic。ヘッダーのリンクから毎回プリフェッチされる |
| `GET /api/spots/[x]/viewer-state` | 9 | 97 | 663 | 97 | 9 | スポット詳細のたびに1回 |
| `POST /api/track` | 19 | 15 | 122 | 15 | 13 | 全ページビューで1回 |
| `GET /stations/[x]` | 14 | 50 | 77 | 50 | 11 | |
| `GET /spots/[x]`（キャッシュHIT） | 43 | 12 | 63 | 12 | 23 | |
| `GET /spots/[x]` プリフェッチ | 123 | 7 | 14 | 7 | 25 | |
| `GET /races/[x]` プリフェッチ | 211 | 5 | 8 | 5 | 10 | |

再生成リクエストの結果別:

| outcome | 件数 | CPU p50 / p90 | 壁時計 p50 |
|---|---:|---|---:|
| ok | 26 | 94 / 269ms | 2.2秒 |
| exceededCpu | 80 | 12 / 77ms | 0.6秒 |
| canceled | 292 | 7 / 10ms | 40.0秒 |

`canceled` は呼び出し元（OpenNextのDOキュー、既定タイムアウト10秒）が打ち切ったもので、壁時計時間が約40秒にそろっている。CPUを使い切る前にI/O待ちのまま止まっている。止まる理由は未特定だが、再生成をやめれば一緒に消える。

## 根本原因の補足

1. **ISRの再生成**: `/spots/[slug]` と `/races/[slug]` は `revalidate = 3600`。配信時に作ったキャッシュは1時間で期限切れになり、その後は閲覧のたびに約100ms CPUの再描画が要る。投稿系の更新では、すでに `revalidatePath` で明示的に無効化している。走行記録もクライアント側で取得している（`SpotRunFeed initialRuns={[]}`）ので、時間ベースの再生成はなくても困らない。
2. **トップ `/` がキャッシュの横取りに当たらない**: @opennextjs/aws 4.0.2 の `cacheInterceptor` は末尾の `/` を除くため、`/` が `""` になってプリレンダー一覧と一致しない（`x-nextjs-cache: HIT` が返り、Next本体が動く）。4.1.10 では `|| "/"` で直っており、@opennextjs/cloudflare 1.20.11 がこれを使っている。
3. **未ログインの `get-session`**: ヘッダーの `UserMenu` が全ページで `authClient.useSession()` を呼ぶ。サーバー側の `getUser()` はcookieがなければスキップするが、APIルート `/api/auth/[...all]` はスキップせず、毎回 `betterAuth({...})` 全体を組み立てる（温まった状態で19〜23ms）。
4. **ルート初回のモジュール評価**: `/robots.txt` 42ms、`/features` 42ms、`/stations/[x]` 50ms、`/login` 133msなど、キャッシュHITのはずのルートでも数十msかかる例がある。isolateが落ちるたびに起きるので、1の空回りを止めれば頻度も下がる。

## 対策（コード側、効果の大きい順）

| # | 対策 | 根拠（実測） | 手間 |
|---|---|---|---|
| **C1** | `/spots/[slug]`・`/races/[slug]` の `revalidate` を `false` にする（配信時に生成。投稿時は既存の `revalidatePath` のまま）。`/`・`/areas`・`/features`・`/races` 一覧の `86400` も同様に見直す | 再生成398回/25分、超過80件はすべてここ。成功しても94〜269ms | 小 |
| **C2** | `middleware.ts` で、セッションcookieのない `GET /api/auth/get-session` に `null` を即返す（better-authもD1も通さない。結果は今と同じ） | 未ログインで19〜23ms、全ページビューで1回 | 小 |
| C3 | @opennextjs/cloudflare を 1.20.11 へ上げる（`/` のキャッシュ横取りの修正を含む。Next 16.3.8以上が必要） | `/` が温まった状態で33ms、プリフェッチで22ms | 中（キャッシュキーの仕様変更を含むので、0%配信で確認） |
| C4 | ヘッダーの `/login` リンクと、force-dynamicのページへのリンクを `prefetch={false}` にする | `/login` のプリフェッチが133ms、`/spots` のプリフェッチが112ms | 小 |
| C5 | `viewer-state` を、cookieがなければD1を引かず即返すようにする（未ログインならお気に入り状態は不要） | 97ms（コールドを含む可能性あり） | 小 |
| C6 | `/api/track` を軽くする（バッチ化するか、Web Analyticsへ寄せる） | 15ms、全ページビューで1回 | 中 |

C1だけでも、この25分で観測した `exceededCpu` 80件は理屈の上ではすべて消え、呼び出し数も約4割減る。C1〜C3で、1ページビューあたりの10ms超えの呼び出しは「再生成＋get-session（＋トップ）」から、ほぼなくなる。

C1の注意点: 投稿や管理画面の更新で `revalidatePath` したページは、その後の最初の閲覧で1回だけ再描画される（約100ms CPU）。無料枠では失敗することがある。投稿は頻繁ではないので、時間ベースの空回りとは桁が違う。確実に反映したいときは再配信する。

## 実装状況（2026-10-15 11:34 JST 本番反映。`release-2026-10-15-worker-cpu-isr.md`）

- **C1（実装）**: `revalidate = false` にしたのは `/spots/[slug]`・`/races/[slug]`・`/areas`・`/areas/[pref]`・`/features`・`/features/[slug]`・`/sitemap.xml`。これらのページが使う `unstable_cache`（`src/db/queries/catalog.ts` の `catalogCache`）も `revalidate: false` にした。こちらに期限が残っていると、ページ側も1日ごとの再生成対象に戻るため。R2のキャッシュキーにはビルドIDが入るので、配信のたびに作り直される。
  - ビルド結果のプリレンダー一覧で、スポット251件・レース93件・エリア48件・特集9件・sitemapが `false` になったことを確認した。
  - `/` と `/races` は今日の日付で「開催前／終了」を振り分けるので、`86400` のまま残した。`/stories/[slug]`（3600）も公開日時で出し分けるので残した。配信後にこの3つでも再生成の空回りが出るようなら、振り分けをクライアント側に移す。
  - 影響: D1へSQLで直接スポットを追加・修正した場合、エリア・特集・sitemap・スポット詳細には次の配信で反映される（これまでは最大1日・1時間遅れ）。
- **C2（実装）**: `src/middleware.ts` に追加。テスト `tests/anonymous-session.test.ts`。
- **C3（見送り）**: @opennextjs/cloudflare 1.20.2以降は、どれも Next 16.2.11以上（1.20.8以降は16.3.8以上）が前提。4.1.10の修正はキャッシュキーの決め方ごと作り直されており、4.0.2に一部だけ移すと `/` の再検証の扱いがずれるおそれがある。Next と OpenNext の更新（セキュリティ修正版への追従を含む）として別に行う。
- **C3（実装、2026-10-15。未配信）**: next 16.2.10 → 16.3.8（eslint-config-next・@next/bundle-analyzer も揃えた）、@opennextjs/cloudflare 1.20.1 → 1.20.11（内部の @opennextjs/aws 4.0.2 → 4.1.10）、wrangler ^4.86 → ^4.151.0。React は 19.2.7 のまま（Next 16.3.8 の peer は `^19.0.0`）。
  - ビルドした `cacheInterceptor` に `decodePathParams(localizedPath) || "/"` が入っていることを確認した。
  - `opennextjs-cloudflare preview`（ローカル）で、`/` のHTMLとRSCプリフェッチ（`RSC: 1`）が `x-opennext-cache: HIT` を返した。更新前は `/` だけ横取りに当たらず `x-nextjs-cache: HIT`（Next本体が描画）だった。`/races`・`/spots/[slug]`・`/areas` も HIT。
  - プリレンダー一覧の再生成設定は配信中の版（ad37749 のビルド）と同じ。`/` と `/races` が 86400、ほかは `false`。件数の差はレース94件→93件だけで、新潟（64b7a32、mainに未マージ）の有無による。
  - Workerサイズは gzip 2856.80KiB / 3072KiB（更新前 3051.71KiB。約195KiB減って、残りは約215KiB）。
  - Next 16.3 のビルドで `next-env.d.ts` に `root-params.d.ts` の import が自動で加わる。
  - 検証: tsc・eslint（警告のみ）・vitest 197件が通過。prettier は今回触れていない10ファイル（`src/lib/race-review-draft.ts` など、HEADの時点で未整形）だけが残る。
  - 配信時の注意: 本番は ad37749（64b7a32＋4016887）なので、mainから配信すると新潟が消える（`check-release-base.mjs` が止める）。本番の版にこのコミットを cherry-pick して配信する。配信後に `curl -sI https://dokorun.com/` が `x-opennext-cache: HIT` を返すことを確かめる。

## 有料プランを検討する条件

C1・C2を入れて0%→10%→100%で配信したあと、同じ方法で計り直す。

- tailで30分の受動収集を行い、**閲覧者のGET/POSTに `exceededCpu` が出ていないか**を見る。
- 3日後にGraphQLで `exceededResources` を日別に再集計する。

それでも閲覧者のリクエストで `exceededCpu` が続き、そのルートの温まった状態のCPUが10msを大きく超える（たとえば30ms以上）ことが実測で示せたら、そのルートの個別対策（C4〜C6など）を先に試す。それでも収まらないときに初めて、有料プラン（$5/月。CPU上限が30秒に上がる）の検討材料にする。
