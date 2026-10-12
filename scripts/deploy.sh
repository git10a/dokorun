#!/bin/bash
# 公開カタログだけのスナップショットを取ってからbuild+uploadする。
# ビルド時プリレンダ(トップ/sitemap)が本番データを参照するための入り口。
# uploadは本番トラフィックを切り替えない。smoke後にrelease.mjsで段階配信する。
set -euo pipefail
cd "$(dirname "$0")/.."

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  echo "deployを中止しました: Wrangler 4はNode.js 22以上が必要です(.nvmrcを使用してください)" >&2
  exit 1
fi

node scripts/d1-snapshot.mjs .d1-build/prod.sqlite

# opennextjs-cloudflare build は内部で `npm run build` を呼ぶため、GPX同期・高低図生成はそちらで走る
D1_PUBLIC_SNAPSHOT=1 D1_LOCAL_PATH=.d1-build/prod.sqlite NEXT_PUBLIC_SITE_URL=https://dokorun.com opennextjs-cloudflare build

sha="$(git rev-parse --short=12 HEAD)"
message="${RELEASE_MESSAGE:-release ${sha}}"
# OpenNextのWrangler引数転送は空白を再引用しないため、version messageを1語へ正規化する。
message="${message// /-}"
opennextjs-cloudflare upload --tag "$sha" --message "$message"

echo "Uploaded version tag: $sha"
# Version Overridesは「デプロイに含まれている版」にしか効かない。先に0%で含めないと、
# smokeは旧版に当たって素通りしてしまう(2026-10-12に発生)
echo "Next: npm run release:promote -- <stable-version-id> <new-version-id> 0"
echo "Then: npm run release:smoke -- <version-id>   (/api/health の version.id が新版になることを確認)"
echo "Then: release:promote ... 10 → 100"
