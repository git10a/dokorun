# OpenNext R2キャッシュの保持

対象は `dokorun-opennext-cache` の `incremental-cache/<buildId>/` のみ。

```sh
node scripts/cache-retention.mjs plan /tmp/dokorun-cache-plan.json
node scripts/cache-retention.mjs apply /tmp/dokorun-cache-plan.json
```

`plan` は読み取りのみ。現行WorkerのビルドIDと全オブジェクトを照合し、現行版・新しく作られた3ビルド・30日以内に書き込まれたビルドを保護する。残りのビルドだけを退役候補としてサイズ・件数とともに保存する。未確認のキー形式は対象外として黙って削除せず、処理を停止する。

`apply` は明示した計画だけを反映する。計画は1時間以内、デプロイ・既存期限設定が変わっていないことが必要。対象を再走査して最近の書き込みがないことを確認後、末尾 `/` を含むビルド単位のプレフィックスに30日の有効期限を追加する。現行のマルチパート中断ルールなど既存設定は維持する。

実際の削除はCloudflare側で非同期に行われる。設定成功は削除完了ではない。翌日以降に `plan` またはR2使用量で減少を確認する。

これは全ビルドへの一律期限設定ではなく、退役を確認したビルドごとの設定。将来のビルド整理には再度 `plan` / `apply` を行う。古い版へ戻す場合はそのビルドの退役ルールを除去し、該当版のキャッシュを再投入してから戻す。コードだけ戻して削除済みの静的キャッシュに依存しないこと。

API認証期限切れ（401）の場合は `npx wrangler whoami` で既存のWrangler認証を更新してから新しい計画を作り直す。秘密情報をログに出さない。

根拠: [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)、インストール済みOpenNext `computeCacheKey` のビルド別キー形式。
