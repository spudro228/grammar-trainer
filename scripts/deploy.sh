#!/usr/bin/env bash
# Выкладка на сервер: rsync исходников и сборка образов на месте.
#   scripts/deploy.sh [ssh-хост=radar]
# Первый запуск создаёт .env на сервере с случайными секретами и печатает токен администратора.
set -euo pipefail
HOST=${1:-radar}
DIR=grammar-trainer
cd "$(dirname "$0")/.."
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude server/dist --exclude .env \
  --exclude source --exclude docs --exclude .DS_Store --exclude '*.log' \
  ./ "$HOST:$DIR/"
ssh "$HOST" "cd $DIR && APP_BUILD=$(date +%Y-%m-%d_%H%M) bash scripts/server-up.sh"
