# 「走ったよ」チェックイン機能 — 実装タスク

サウナイキタイの「本文なしチェックイン投稿」( https://sauna-ikitai.com/news/howto-sakatsu )のどこラン版。
スポット詳細ページで **1タップで「走ったよ」を記録できる** 導線を追加する。

この文書が唯一の仕様。曖昧な点は既存コードの慣例に合わせて進めること。UIテキストは日本語、コード(変数名・コメント)は英語。

---

## 1. 背景と目的

- 現状のドコログ投稿はフォームページ(`/spots/[slug]/log/new`)経由のみ。`comment` は既に任意(DB nullable・Zodもmin無し)だが、フォームに遷移して日付・公開設定を確認して送信、という流れ自体が重い。
- サウナイキタイのチェックインと同様に、**本文もフォームも無しの最軽量投稿**を作り、投稿のハードルを下げてUGCを増やす。
- 命名: ユーザー向け文言は「**走ったよ**」。内部ではチェックイン(check-in)と呼ぶ。

## 2. 設計方針(決定事項 — 再検討しないこと)

1. **DBマイグレーションはしない。** チェックインは既存 `runs` テーブルの1行として保存する。チェックイン = `comment: null` の run。専用カラム(`kind` 等)は追加しない。
   - `src/db/schema.ts` にある `runDays` テーブル(129〜134行)は撤去済みの草カレンダー機能の残骸で未使用。**使わないこと。触らないこと。**
2. チェックインの値は固定: `ranAt` = JST今日の正午、`visibility` = `"public"`、`comment`/`courseId`/`distanceM`/`durationS` = `null`。日付を変えたい・非公開にしたい場合は既存フォーム or 投稿後の編集ページを使う。
3. **同一ユーザー × 同一スポット × 同一JST日** のチェックインは1回まで。既に当日分がある場合は挿入せずエラーメッセージを返す(フォーム経由の投稿は従来どおり無制限。重複判定はチェックインactionの中だけで行う)。
4. 既存の1日20件レート制限・スポット存在確認(`isPublished`)はチェックインにも適用する。
5. NGワードチェックは不要(本文が無いため)。
6. ログアウト時にボタンを押したら `/login?callbackURL=/spots/{slug}#dokolog` へ。**ログイン後に自動投稿はしない**(誤爆防止)。戻ってきてもう一度押してもらう。

## 3. 実装内容

### 3.1 Server Action: `checkInRun` — [src/app/me/logs/actions.ts](../src/app/me/logs/actions.ts)

既存の `createRun` と同じファイルに追加する。既存の `jstDayBounds()` を再利用。

```ts
export type CheckInState = { message?: string };

export async function checkInRun(_: CheckInState, formData: FormData): Promise<CheckInState> {
  // 1. requireUser(`/spots/${spotSlug}#dokolog`) で認証
  // 2. spotId(uuid) / spotSlug(1..120) を zod で検証。失敗なら { message: "スポットが見つかりません" }
  // 3. 1日20件レート制限(createRun と同じクエリ)
  // 4. 同日重複チェック: runs から userId & spotId & ranAt が jstDayBounds() 内の行を検索。
  //    あれば { message: "今日はこのスポットで記録済みです" } を返す
  // 5. スポット存在確認(createRun 61行と同じ: id + slug + isPublished)
  // 6. insert: { userId, spotId, courseId: null, ranAt: JST今日の正午, distanceM: null,
  //    durationS: null, comment: null, visibility: "public", updatedAt: new Date() }
  //    .returning({ id: runs.id }) で新規runのidを取得
  // 7. revalidatePath(`/spots/${spotSlug}`); revalidatePath("/me/logs");
  // 8. redirect(`/spots/${spotSlug}?posted=checkin&run=${id}#dokolog`)
}
```

- JST今日の正午は `runValues` と同じ形式で作る: `jstDayBounds().start` から `YYYY-MM-DD` を導出するか、`new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())` で日付文字列を得て `new Date(\`${dateStr}T12:00:00+09:00\`)`。
- 重複チェックとinsertの間に厳密なトランザクションは不要(betterAuthのadapterも `transaction: false` の環境)。ボタン側のpending無効化(3.2)で二重送信を防ぐ。

### 3.2 UIコンポーネント: `CheckInButton` — `src/components/checkin-button.tsx`(新規)

`"use client"`。既存の [run-form.tsx](../src/components/run-form.tsx) と同じく `useActionState` を使う。

Props: `{ spotId: string; spotSlug: string; loggedIn: boolean; todayRunId: string | null }`

- `todayRunId` が非null(=今日チェックイン済み)の場合: ボタンの代わりに
  `<span>✓ 今日走ったよ済み</span>` + `<Link href={\`/me/logs/${todayRunId}/edit?returnTo=spot\`}>ひとことを追加</Link>` を表示。
- 未ログイン時: `<Link href={\`/login?callbackURL=...\`}>` としてボタンと同じ見た目で表示。
- ログイン済み・未チェックイン時: `<form action={formAction}>` に hidden で `spotId` / `spotSlug` を入れ、submitボタン「**走ったよ 🏃**」。`useFormStatus` または `isPending` で送信中は `disabled` + 文言「記録中…」。
- action が `message` を返したら小さくテキスト表示。
- 見た目は既存の主要ボタンに合わせる(`rounded-lg bg-brand px-4 py-2.5 text-sm font-bold` 系)。lucide等の新規アイコン importは不要(絵文字でよい。Workersのバンドルサイズ制約があるため依存を増やさない)。

### 3.3 スポット詳細ページへの組み込み — [src/app/spots/[slug]/page.tsx](../src/app/spots/[slug]/page.tsx)

- `#dokolog` セクションのヘッダ行(78行)に `CheckInButton` を追加する。配置: 「走った記録を投稿」リンクの**左隣**に置き、チェックインを主導線、フォーム投稿を副導線とする(フォームへのリンク文言は「ひとことつきで投稿」に変更)。
- データ取得: `Promise.all`(41〜46行)に `user ? getTodayRunId(spot.id, user.id) : null` を追加。
- 投稿完了メッセージ: `searchParams` の `posted` / `run` を受け、79〜80行の並びに追加:
  ```tsx
  {query.posted === "checkin" && <p className="...">走ったよを記録しました 🏃 {query.run && <Link href={`/me/logs/${query.run}/edit?returnTo=spot`} className="underline">ひとことを追加する</Link>}</p>}
  ```
  `searchParams` の型に `run?: string` を追加。`query.run` はuuid形式チェック(`/^[0-9a-f-]{36}$/i` 程度)を通してからリンクに使う。

### 3.4 データヘルパー: `getTodayRunId` — [src/db/data.ts](../src/db/data.ts)

```ts
// 同一JST日にそのユーザーがそのスポットへ残した run の id を返す(無ければ null)
export async function getTodayRunId(spotId: string, userId: string): Promise<string | null>
```
- `ranAt` が JST当日範囲(actions.ts の `jstDayBounds` と同じ計算)にある行を1件検索。`jstDayBounds` は actions.ts から export するか、重複実装を避けたければ `src/lib/` へ移してもよい(移す場合はimport元を両方更新)。

### 3.5 本文なし投稿の表示

comment が null のカードが「メタ情報だけの空っぽなカード」に見えないよう、以下3箇所の `{run.comment && <p ...>}` を三項演算子にして、null時は控えめな定型文を出す:

```tsx
{run.comment ? <p className="mt-3 whitespace-pre-line leading-7">{run.comment}</p> : <p className="mt-3 text-sm text-sub">走ったよ 🏃</p>}
```

- [src/app/spots/[slug]/page.tsx:83](../src/app/spots/[slug]/page.tsx)
- [src/app/me/logs/page.tsx](../src/app/me/logs/page.tsx)(13行付近)
- [src/app/u/[handle]/page.tsx](../src/app/u/[handle]/page.tsx)(109行付近)

既存のフォーム経由の本文なし投稿にも同じ表示が適用されるが、意味的に同じものなのでこれで正しい。

## 4. 触らないもの

- 既存フォーム(`run-form.tsx`)・`createRun`/`updateRun`/`deleteRun` のロジック(スポットページのリンク文言変更を除く)
- `runDays` テーブル、スキーマ全般(マイグレーション禁止)
- 編集ページ: チェックイン投稿も既存の編集ページでそのまま編集・削除できる(comment追加=「ひとこと追加」になる)。変更不要。

## 5. テスト

- `npm run test`(vitest)が通ること。
- 可能なら JST日付境界のロジック(重複判定に使う範囲計算)を純関数として切り出し、`tests/checkin.test.ts` で境界ケース(JST 0:00前後 = UTC 15:00前後)を1〜2件テストする。Server Action自体のテストは不要。
- `npm run lint` が通ること。

## 6. 受け入れ条件

1. ログイン済みユーザーがスポット詳細で「走ったよ 🏃」を押すと、フォームを経由せず即座に公開ドコログが1件作成され、「走ったよを記録しました 🏃 / ひとことを追加する」が表示される。
2. 同じスポットで同日もう一度押せない(ボタンが「✓ 今日走ったよ済み + ひとことを追加」表示になる)。別スポットでは同日でもチェックインできる。
3. 未ログインで押すとログインページへ飛び、ログイン後スポットページに戻る(自動投稿はされない)。
4. 本文なしのドコログカードが、スポット詳細・マイページ・公開プロフィールの3箇所で「走ったよ 🏃」表示になる。
5. 1日20件制限がチェックインにも効く。
6. `npm run lint` / `npm run test` が通る。
