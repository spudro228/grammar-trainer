#!/usr/bin/env bash
# Выполняется на сервере из папки проекта: .env, сборка по одному образу (мало памяти), запуск, проверка.
set -euo pipefail
if [ ! -f .env ]; then
  IP=$(curl -s -m 5 ifconfig.me || hostname -I | awk '{print $1}')
  cat > .env <<ENV
POSTGRES_PASSWORD=$(openssl rand -hex 16)
ADMIN_TOKEN=$(openssl rand -hex 24)
SITE_ADDRESS=${SITE_ADDRESS:-$(echo "$IP" | tr . -).sslip.io}
LOG_LEVEL=info
ENV
  echo "Создан .env. Токен администратора:"
  grep ADMIN_TOKEN .env
fi
export APP_BUILD=${APP_BUILD:-$(date +%Y-%m-%d_%H%M)}
COMPOSE="docker compose -f compose.yml -f compose.prod.yml"
$COMPOSE build api
$COMPOSE build web
$COMPOSE up -d --remove-orphans
docker image prune -f >/dev/null
for i in $(seq 1 30); do
  if curl -fs -m 5 http://127.0.0.1/api/health -H "Host: $(grep SITE_ADDRESS .env | cut -d= -f2)" >/dev/null 2>&1; then echo "api: ok"; break; fi
  sleep 2
done
$COMPOSE ps --format '{{.Service}} {{.Status}}'
echo "Адрес: https://$(grep SITE_ADDRESS .env | cut -d= -f2)/"
