# 間欠的503対策：ISRの時間ベース再生成を停止

2026-10-15 11:34 JST、本番100%に反映。調査は `investigation-2026-10-15-worker-503.md`。

- Worker: `d01cf55e-3dc9-4361-96ae-9d423f5e13c0`、tag `ad377496d17e`（`64b7a32` に `4016887` をcherry-pickした `release/worker-cpu-isr-on-64b7a32`）。
- deployment: `5de83379-a501-42f3-89b1-24d4ab654d40`、100%。
- 直前のWorker: `aacbd52e-c26a-4942-9b4b-4f9f9c395e39`（新潟シティマラソン、tag `64b7a32`）。
- mainには `4016887` としてfast-forwardで入れた。`64b7a32`（`codex/niigata-city-marathon-release`）はまだmainに入っていない。**次に新潟のブランチから配信するときは、`4016887` を含めないと、この対策が巻き戻る。**

## 変更

- `/spots/[slug]`・`/races/[slug]`・`/areas`・`/areas/[pref]`・`/features`・`/features/[slug]`・`/sitemap.xml` を `revalidate = false` にした。公開カタログの `unstable_cache` も期限なしにした。投稿・管理画面の更新は、既存の `revalidatePath` で反映する。D1へ直接投入したスポットは、次の配信で反映される。
- `/`・`/races`・`/stories/[slug]` は日付で出し分けるため、時間ベースの再生成を残した。
- `middleware.ts` で、セッションcookieのない `GET /api/auth/get-session` に `null` を即返すようにした。

## 検証

- Vitest 41ファイル197テスト、`tsc --noEmit`、対象ESLint・Prettier、OpenNextの本番ビルドが成功。プリレンダー一覧で、スポット251件・レース93件・エリア48件・特集9件・sitemapが `false` になったことを確認した。
- サイズは gzip 3051.71KiB。無料プランの上限3072KiBまで残り約20KiBしかない。
- 0%でsmoke 5周成功。新版を指定して確認したところ、スポット・レース・エリアは `s-maxage=31536000` の `HIT`、`/races/niigata-city-marathon` も200、`get-session` は `null` と `private, no-store` を返した。
- 10%（4分間、アクセス3件で新版への着弾なし）を経て100%。100%で通常アクセスのsmoke 5周成功。healthは新版のIDを返した。
- クエリマスキング有効、invocation logsとtraces無効をAPIで読み戻して確認した。

## 効果（`wrangler tail` の実測）

| | 配信前（09:39〜10:25、旧版） | 配信後（11:35〜12:05、新版） |
|---|---:|---:|
| 呼び出し | 1,070 | 311 |
| `exceededCpu` | 80（すべて再生成のHEAD） | **0** |
| `canceled` | 301（ほぼ再生成のHEAD） | **0** |
| 再生成のHEAD | 398 | **0** |
| 未ログイン `get-session` のCPU中央値 | 23ms | **2ms** |

配信後は昼の時間帯でアクセスが少ない。3日後に、GraphQLで `exceededResources` を日別に再集計して確かめる。

## 残っている重い処理（配信後の実測）

- コールドスタート（300ms以上が311件中22件）。初回の `viewer-state`・`/spots`・`/` で600〜900ms。
- `/login` のプリフェッチ（温まった状態で111ms）、`/spots` のプリフェッチ（81ms）、`/stations/[x]`（52ms）、`/races/[x]` 本体（55ms）、`/` 本体（C3未対応）。
- 10ms超えは全体の34%。それでも超過は0件だった。次の候補は、調査文書のC3（Next・OpenNextの更新）、C4（`prefetch={false}`）、C5（`viewer-state`）。
