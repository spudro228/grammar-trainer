# Образ для проверок: все зависимости, исходники, без сборки.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --ignore-scripts && npm rebuild esbuild
COPY . .
CMD ["npm", "run", "check"]
