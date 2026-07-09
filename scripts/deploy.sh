#!/bin/bash
# 本番D1のスナップショットを取ってからbuild+deployする。
# ビルド時プリレンダ(トップ/sitemap)が本番データを参照するための入り口。
set -euo pipefail
cd "$(dirname "$0")/.."

# predeploy(package.json)でも実行されるが、deploy.sh単体実行にも備えてここでも取る
node scripts/d1-snapshot.mjs .d1-build/prod.sqlite

D1_LOCAL_PATH=.d1-build/prod.sqlite NEXT_PUBLIC_SITE_URL=https://dokorun.com opennextjs-cloudflare build
opennextjs-cloudflare deploy
