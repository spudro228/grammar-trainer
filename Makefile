# Короткие команды. Нужен Docker (Docker Desktop, OrbStack или colima).
.PHONY: up down logs dev test test-local check build psql clean

up:            ## собрать и поднять prod-стек: http://localhost:8080
	docker compose up -d --build

down:          ## остановить
	docker compose down

logs:          ## логи api и web
	docker compose logs -f api web

up-logs:       ## prod-стек + Loki/Grafana/GlitchTip: Grafana :3001, GlitchTip :8001
	docker compose -f compose.yml -f compose.logs.yml up -d --build

down-logs:     ## остановить всё, включая стек логов
	docker compose -f compose.yml -f compose.logs.yml down

dev:           ## разработка в контейнерах с горячей перезагрузкой
	docker compose -f compose.yml -f compose.dev.yml up

test:          ## типы + линтер + тесты в контейнере, API на настоящем Postgres
	docker compose -f compose.test.yml run --rm --build test; docker compose -f compose.test.yml down

test-local:    ## то же без Docker (API-тесты на Postgres пропускаются)
	npm run check

build:         ## собрать образы
	docker compose build

psql:          ## консоль базы
	docker compose exec db psql -U trainer trainer

clean:         ## остановить и удалить данные базы
	docker compose down -v
