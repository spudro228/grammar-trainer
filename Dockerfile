# Веб-клиент: сборка Vite, раздача nginx с прокси /api на сервис api.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --ignore-scripts && npm rebuild esbuild
COPY tsconfig.json vite.config.ts index.html ./
COPY shared shared
COPY src src
# tsconfig клиента проверяет и тесты, а они импортируют код сервера
COPY server/tsconfig.json server/
COPY server/src server/src
COPY public public
ARG VITE_API_URL=/api
ARG VITE_SENTRY_DSN=
ARG APP_BUILD=
ENV VITE_API_URL=$VITE_API_URL VITE_SENTRY_DSN=$VITE_SENTRY_DSN APP_BUILD=$APP_BUILD
RUN npx tsc -p tsconfig.json && npx vite build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
