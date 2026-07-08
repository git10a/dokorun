# プロフィールページ統合・アバターアップロード化タスク

対象: Sonnet 5(実装担当)。このドキュメントだけで実装できるよう、現状・設計判断・手順をまとめる。

## スコープ(3項目)

1. **マイページ(`/me`)と公開プロフィール(`/u/[handle]`)の統合** — ページを分けない。`/u/[handle]` を唯一のプロフィールページにし、本人が見ているときだけ編集UI・本人用メニューを出す。`/me` は `/u/{handle}` へのリダイレクトにする。
2. **走り始めた「年」に「月」を追加** — 年だけでなく月まで入力・表示できるようにする。
3. **プリセットアバター(12種SVG)の廃止 → 画像アップロード化** — ユーザーが好きな画像をアップロードしてアバターにできるようにする。R2は未有効なので使わない(後述の方式で実装)。

---

## 前提(現状の構成)

- Next.js 16 App Router + React 19 + Tailwind v4。Cloudflare Workers(OpenNext)+ Neon Postgres + Drizzle。
- 認証: Better Auth(Google)。`src/lib/better-auth.ts`。`session.cookieCache`(5分)有効 — セッションcookie内のユーザー情報は最大5分古い。
- マイグレーションは **`npm run db:push`(drizzle-kit push)** 運用。マイグレーションファイルなし。本番反映は `DATABASE_URL` を本番Neonに上書きして push(ユーザーが手動で行うので、ローカル/開発DBへのpushまででよい)。
- **R2は未有効**(`wrangler.jsonc` でコメントアウト)。`POST /api/upload`(管理者用スポット画像アップロード)はR2依存で現在503になる。**今回のアバターはR2を使わずDB保存方式にする**(後述)。
- **バンドルサイズ制約**: Workers無料プラン 3MiB gzip、残り約139KiB。**新しいnpm依存は追加しない**(画像リサイズはブラウザのcanvasで行う。sharp等のサーバー側画像処理は絶対に入れない)。
- **Workers CPU 10ms制約**: サーバー側で画像のデコード・変換をしない。バリデーションとバイト列の受け渡しのみ。
- パッケージマネージャは **npm**(pnpm不可)。
- 他エージェントが並行で作業していることがある。**このタスクに関係ないファイルは触らない**。

### 関係する現状ファイル

| 役割 | パス |
|---|---|
| マイページ | `src/app/me/page.tsx`(requireUser → AvatarPicker + ProfileForm + PbForm + RunCheckinButton + RunGrass + 本人用リンク集) |
| 公開プロフィール | `src/app/u/[handle]/page.tsx`(閲覧者判定なし、noindex設定あり) |
| プロフィール更新 | `src/app/me/actions.ts` の `updateProfile`(Server Action、zod検証、`revalidatePath`) |
| アバター定義 | `src/lib/avatars.ts`(`AVATAR_KEYS` 12種、`isAvatarKey`、`avatarUrl(user)`) |
| アバター画像 | `public/avatars/*.svg`(12ファイル) |
| アバター選択UI | `src/components/auth/avatar-picker.tsx`(`authClient.updateUser({ avatarKey })` 経由で保存) |
| Better Auth設定 | `src/lib/better-auth.ts`(`avatarKey` を additionalFields 登録 + update.before フックで `isAvatarKey` 検証) |
| スキーマ | `src/db/schema.ts`(users: `avatarKey`, `runningSinceYear` 等) |
| セッション取得 | `src/lib/user.ts`(`getUser()` / `requireUser()`) |
| プロフィールフォーム | `src/components/auth/profile-form.tsx`(`runningSinceYear` の select あり) |
| ヘッダーメニュー | `src/components/auth/user-menu.tsx`(`/me` リンク) |

---

## 1. ページ統合(`/u/[handle]` に一本化)

### 設計

- `/u/[handle]/page.tsx` で `getUser()` を呼び、`isOwner = viewer?.id === profileUser.id` を判定する。
- **isOwner のとき追加表示するもの**(現在 `/me` にあるもの):
  - 本人用リンクカード群(`/me/hashiritai`、`/me/favorites`、`/me/logs` へのリンク。これらのサブページは今回そのまま残す)
  - `RunCheckinButton`(今日・昨日の記録)
  - 「プロフィールを編集」ボタン → 押すと編集パネルが開く(下記)
- **編集パネル**: 新規クライアントコンポーネント `src/components/auth/profile-edit-panel.tsx` を作る。`useState` の開閉トグルで、開くと AvatarUploader(§3で新設)+ `ProfileForm` + `PbForm` を表示する。別ページには**しない**(ユーザー要望: ページを分けない)。
  - ProfileForm / PbForm は既存のものをそのまま流用(Server Action 依存なので配置ページが変わっても動く)。
  - 初期値の受け渡しは現在 `/me/page.tsx` が `getProfileUser` / `getUserPbs` の結果を渡している方法を踏襲。`/u/[handle]` は既に同等のデータを取得しているのでそれを使う。
- 非オーナー(未ログイン含む)には編集UI・チェックインボタン・本人用リンクを一切出さない。表示は現行の公開プロフィールと同じ。
- `robots: { index: false }` は現状維持。

### `/me` の扱い

- `src/app/me/page.tsx` を丸ごと置き換え: `requireUser("/me")` → 自分の handle を取得して `redirect(\`/u/${handle}\`)` するだけにする。
  - セッションユーザーに `handle` が含まれるか確認(additionalFields 登録済みのはず)。含まれなければ DB から1回引く。
- `user-menu.tsx` の「マイページ」リンクは `/me` のままでよい(リダイレクトで飛ぶ。handle変更に自動追従できる利点がある)。
- `src/app/me/actions.ts` は場所を変えず存置(Server Action の import 元が変わるだけ)。
- `updateProfile` で **handle が変更された場合**は、`revalidatePath` 後に新しい `/u/{newHandle}` に `redirect` する処理を追加(古いhandleのページに留まると404になるため)。

---

## 2. 走り始めた年月(月の追加)

### スキーマ

`src/db/schema.ts` の users に追加(加算的なので push で安全):

```ts
runningSinceMonth: integer("running_since_month"), // 1〜12。null可。年が未設定なら月も必ずnull
```

### バリデーション(`src/app/me/actions.ts` の profileSchema)

- `runningSinceMonth`: 空文字→null の preprocess、`z.number().int().min(1).max(12).nullable()`
- **相関ルール**: 年がnullなら月もnullに強制(`.transform` か update 前の後処理で `if (!year) month = null`)。

### UI(`src/components/auth/profile-form.tsx`)

- 既存の年 select の横に月 select(未設定/1月〜12月)を並べる。ラベルは「走り始めた年月」。
- 月だけ選んで年未選択の場合はサーバー側で月がnullになる(上記ルール)ので、UI側で厳密に縛らなくてよいが、年が未設定のとき月selectをdisabledにするとなお良い。

### 表示(`src/app/u/[handle]/page.tsx`)

- 現在: `runnerYears = jstYear() - runningSinceYear + 1` で「ランナー歴 N年目」バッジ。
- 月がある場合は月まで考慮して計算する: 経過月数 `months = (jstYear() - y) * 12 + (jstMonth() - m)`、`runnerYears = Math.floor(months / 12) + 1`(monthsが負になるケースは1年目に丸める)。`jstMonth()` が `src/lib/jst.ts` になければ `jstYear()` と同パターンで追加。
- バッジの近くに小さく「YYYY年M月〜」(月未設定なら「YYYY年〜」)を添える。

---

## 3. アバター画像アップロード(プリセット廃止)

### 設計判断(重要)

R2が使えないため、**画像はNeonに保存し、専用Route Handlerで配信する**。ポイント:

- **ブラウザ側で正方形256pxにリサイズしてから送る**(canvas)。サーバーは画像処理をしない(CPU 10ms対策)。webp品質0.85で概ね10〜30KB。
- users テーブルには**blobを入れない**(一覧クエリが太るため)。別テーブル `user_avatars` に base64 で保存。
- 配信は `GET /avatar/[userId]` で行い、HTMLには data URL を埋め込まない(スポット詳細等でアバターが複数並ぶページのペイロード肥大を防ぐ)。
- 将来R2を有効化したら、保存先とこのRouteの中身を差し替えるだけで移行できる。

### 3-1. スキーマ

```ts
// 新テーブル。users 1人につき最大1行
export const userAvatars = pgTable("user_avatars", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  data: text("data").notNull(),          // base64(プレフィックスなし)
  contentType: text("content_type").notNull(), // image/webp | image/jpeg | image/png
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

users には版管理用カラムを追加(avatarUrl の分岐とキャッシュバスターに使う):

```ts
customAvatarAt: timestamp("custom_avatar_at"), // null = カスタムアバターなし
```

**`avatarKey` カラムの削除**もこのタイミングで行う。drizzle-kit push はカラム削除時に確認を求めるので承認してよい(プリセットを選んでいた既存ユーザーはGoogle画像にフォールバックする。これは許容済みの仕様)。

### 3-2. アップロード経路(Server Action)

`src/app/me/actions.ts` に追加:

```ts
export async function updateAvatar(formData: FormData) {
  // requireUser 相当のチェック(getUser() で null なら error)
  // file = formData.get("file") as File
  // 検証: contentType が image/webp|jpeg|png、size <= 200 * 1024
  // arrayBuffer → base64(Buffer.from(buf).toString("base64"))
  // user_avatars に upsert(onConflictDoUpdate)、users.customAvatarAt = new Date() に更新
  // revalidatePath(`/u/${handle}`)
}

export async function deleteAvatar() {
  // user_avatars から delete、users.customAvatarAt = null
  // revalidatePath
}
```

- 従来の `authClient.updateUser({ avatarKey })` 経路は廃止。`src/lib/better-auth.ts` から `avatarKey` の additionalFields 登録と `update.before` フック(`isAvatarKey` 検証)を削除する。

### 3-3. 配信Route

新規 `src/app/avatar/[userId]/route.ts`:

```ts
// GET: user_avatars を1行select → base64デコード(Buffer.from(data, "base64"))→
// new Response(bytes, { headers: { "Content-Type": contentType, "Cache-Control": ... } })
// 見つからなければ 404
// Cache-Control: ?v= クエリ付きリクエストは public, max-age=31536000, immutable
//                なしは public, max-age=300
```

- userId はuuid形式かを先に検証してからクエリ(不正入力でのDBエラー回避)。
- runtime指定は他のroute.tsに合わせる(OpenNext環境なので特別な設定は不要のはず)。

### 3-4. `avatarUrl()` の書き換え(`src/lib/avatars.ts`)

```ts
// AVATAR_KEYS / isAvatarKey / プリセット関連を全削除して以下に置き換え
export function avatarUrl(user: {
  id: string;
  image: string | null;
  customAvatarAt: Date | string | null;
}): string | null {
  if (user.customAvatarAt) {
    const v = new Date(user.customAvatarAt).getTime();
    return `/avatar/${user.id}?v=${v}`;
  }
  return user.image ?? null;
}
```

- **呼び出し箇所を全部grepして直す**(`avatarUrl(` と `avatarKey` で全文検索)。データ取得側(`src/db/data.ts` の `getProfileUser` や公開ドコログ取得など)で select しているカラムに `customAvatarAt` を追加し、`avatarKey` の select を除去する。
- null のときのフォールバック(人型アイコン等)は各呼び出し箇所の現行挙動を踏襲。
- ヘッダー(`user-menu.tsx`)はセッションcookie由来で `customAvatarAt` を持たない可能性が高い。ヘッダーだけはログイン中ユーザーに対し常に `/avatar/${session.user.id}` を試み、404なら `session.user.image` にフォールバックする実装(`<img onError>` で差し替え、または素直に `session.user.image` 表示のまま)でよい。**ここで凝りすぎない**こと。最悪ヘッダーが5分古いのは cookieCache 由来の既存挙動と同等で許容。

### 3-5. アップロードUI

新規 `src/components/auth/avatar-uploader.tsx`(`"use client"`)。`avatar-picker.tsx` は削除。

- 現在のアバターをプレビュー表示 + 「画像を選ぶ」ボタン(`<input type="file" accept="image/*">`)+ カスタム設定済みなら「削除してGoogleの画像に戻す」ボタン(→ `deleteAvatar()`)。
- 選択時の処理(ブラウザ内):
  1. `createImageBitmap(file)`(失敗したら `<img>` + objectURL でフォールバック)
  2. canvas 256×256 に **cover で中央クロップ**して描画
  3. `canvas.toBlob(cb, "image/webp", 0.85)` → 得られた `blob.type` が `image/webp` でなければ(Safari旧版)`"image/jpeg", 0.85` で再試行
  4. FormData に載せて `updateAvatar` を呼ぶ → 成功したら `router.refresh()`
- HEICなど`createImageBitmap`が読めない形式はエラーメッセージ表示(「対応していない画像形式です」)。

### 3-6. 削除するもの(チェックリスト)

- [ ] `public/avatars/*.svg`(12ファイル)
- [ ] `src/components/auth/avatar-picker.tsx`
- [ ] `src/lib/avatars.ts` の `AVATAR_KEYS` / `isAvatarKey`(`avatarUrl` は書き換えて残す)
- [ ] `src/lib/better-auth.ts` の `avatarKey` additionalField と `update.before` の検証フック
- [ ] `src/db/schema.ts` の `users.avatarKey`(push時にカラムdrop)
- [ ] その他 `avatarKey` を参照している箇所すべて(grepで確認)

---

## 実装順序(推奨)

1. スキーマ変更(`runningSinceMonth` / `customAvatarAt` / `userAvatars` 追加、`avatarKey` 削除)→ `npm run db:push`(ローカル/開発DB)
2. アバター基盤(avatars.ts 書き換え → 配信Route → Server Action → AvatarUploader → 旧プリセット一式削除 → 呼び出し箇所修正)
3. 年月対応(schema済み → actions.ts → profile-form.tsx → 表示)
4. ページ統合(`/u/[handle]` に isOwner 分岐 + ProfileEditPanel → `/me` をリダイレクト化 → handle変更時redirect)
5. 検証(下記)

## 検証

- `npm run lint` / `npm run build` が通ること。
- `npm run dev` でブラウザ確認:
  - 未ログインで `/u/{handle}` → 編集UI・チェックインが出ない
  - 本人ログインで `/u/{自分のhandle}` → 編集ボタンが出る。編集パネルで名前・bio・年月・PBを更新でき、保存後ページに反映される
  - handle を変更 → 新URLにリダイレクトされる
  - `/me` → 自分の `/u/{handle}` にリダイレクト
  - 画像をアップロード → プロフィールと(可能なら)ヘッダーに反映。`/avatar/{userId}` が画像を返す。大きい画像(数MBのスマホ写真)でも256pxに縮小されて送信される(DevToolsのNetworkでリクエストサイズが数十KBであること)
  - アバター削除 → Google画像に戻る
  - 別ユーザー(シークレットウィンドウ等)から見て編集UIが出ないこと
- 既存ページの回帰: スポット詳細のドコログのアバター表示、トップ等で `avatarKey` 参照の残骸がないこと(grepで0件)。

## やらないこと(スコープ外)

- 本番Neonへのpush・本番デプロイ(ユーザーが手動で行う)
- R2有効化・R2への移行
- `/me/hashiritai` `/me/favorites` `/me/logs` のURL変更(そのまま残す)
- 画像のモデレーション、複数サイズ生成
