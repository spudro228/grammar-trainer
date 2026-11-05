// Точка входа: Postgres из DATABASE_URL, порт из PORT (по умолчанию 3000), администратор из ADMIN_TOKEN.
import { createServer } from 'node:http'
import { createApp } from './app.js'
import { createLogger, initSentry } from './log.js'
import { PgStore } from './store.js'

const log = createLogger()
if (initSentry()) log.info('Sentry/GlitchTip включён')

const url = process.env['DATABASE_URL']
if (!url) {
  log.fatal('Нужна переменная DATABASE_URL, например postgres://trainer:trainer@localhost:5432/trainer')
  process.exit(1)
}
const adminToken = process.env['ADMIN_TOKEN']
if (!adminToken || adminToken.length < 12) {
  log.fatal('Нужна переменная ADMIN_TOKEN (не короче 12 знаков): токен суперадмина. Например: openssl rand -hex 24')
  process.exit(1)
}
const port = Number(process.env['PORT'] ?? 3000)

const store = new PgStore(url)
await retry(async () => { await store.migrate() }, 20, 1500)
await store.upsertAdmin(adminToken)
const handle = createApp({ store, log })
const server = createServer((req, res) => {
  void handle(req, res)
})
server.listen(port, () => {
  log.info({ port, build: process.env['APP_BUILD'] ?? 'dev' }, `api: http://localhost:${String(port)}/api/health`)
})

async function retry(fn: () => Promise<void>, times: number, delayMs: number) {
  for (let i = 1; ; i++) {
    try {
      await fn()
      return
    } catch (e) {
      if (i >= times) throw e
      log.warn({ attempt: i, of: times }, 'база не готова, повтор')
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

const stop = () => {
  log.info('остановка')
  server.close(() => {
    void store.close().then(() => {
      process.exit(0)
    })
  })
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
