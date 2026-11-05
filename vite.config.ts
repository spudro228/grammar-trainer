/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Метка сборки: попадает в журнал клиента и отчёты (сопоставить с кодом). В Docker — APP_BUILD.
  define: { __BUILD__: JSON.stringify(process.env.APP_BUILD ?? `dev-${new Date().toISOString().slice(0, 16)}`) },
  plugins: [react()],
  base: './',
  server: {
    // В разработке запросы /api идут на сервер из server/ (npm run dev:api).
    proxy: { '/api': process.env.API_PROXY ?? 'http://localhost:3000' },
  },
  test: {
    // jsdom по умолчанию; чистые тесты объявляют `// @vitest-environment node` и стартуют быстрее.
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/src/**/*.test.ts'],
    pool: 'threads',
  },
})
