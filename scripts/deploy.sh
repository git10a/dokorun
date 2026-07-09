#!/bin/bash
# 本番Neonの.env.productionを読み込んでからbuild+deployする。
# DATABASE_URLをコマンドライン引数で渡さないための入り口。
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

NEXT_PUBLIC_SITE_URL=https://dokorun.com opennextjs-cloudflare build
opennextjs-cloudflare deploy
