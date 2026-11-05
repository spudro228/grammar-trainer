# API-сервер. Контекст сборки — корень репозитория (нужна папка shared/).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --ignore-scripts
COPY shared shared
COPY server/tsconfig.json server/
COPY server/src server/src
RUN npx tsc -p server/tsconfig.json && cp server/src/schema.sql server/dist/server/src/

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --ignore-scripts --workspace server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server/dist/server/src/index.js"]
