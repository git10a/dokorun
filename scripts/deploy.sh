#!/bin/bash
# 本番D1のスナップショットを取ってからbuild+uploadする。
# ビルド時プリレンダ(トップ/sitemap)が本番データを参照するための入り口。
# uploadは本番トラフィックを切り替えない。smoke後にrelease.mjsで段階配信する。
set -euo pipefail
cd "$(dirname "$0")/.."

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  echo "deployを中止しました: Wrangler 4はNode.js 22以上が必要です(.nvmrcを使用してください)" >&2
  exit 1
fi

# predeploy(package.json)でも実行されるが、deploy.sh単体実行にも備えてここでも取る
node scripts/d1-snapshot.mjs .d1-build/prod.sqlite
node scripts/sync-public-spot-gpx.mjs

D1_LOCAL_PATH=.d1-build/prod.sqlite NEXT_PUBLIC_SITE_URL=https://dokorun.com opennextjs-cloudflare build

sha="$(git rev-parse --short=12 HEAD)"
message="${RELEASE_MESSAGE:-release ${sha}}"
opennextjs-cloudflare upload --tag "$sha" --message "$message"

echo "Uploaded version tag: $sha"
echo "Next: npm run release:smoke -- <version-id>"
echo "Then: npm run release:promote -- <stable-version-id> <new-version-id> 0"
