// Логирование сервера: pino (JSON в stdout, по строке на событие) и, если задан SENTRY_DSN, отправка ошибок
// в Sentry-совместимый сервис (GlitchTip). Каждая запись запроса несёт requestId, пользователя, статус и время.
import pino, { type Logger } from 'pino'
import * as Sentry from '@sentry/node'

export type { Logger }

export interface LogOptions {
  level?: string
  /** Человекочитаемый вывод для разработки (pino-pretty). */
  pretty?: boolean
}

export function createLogger(opts: LogOptions = {}): Logger {
  const level = opts.level ?? process.env['LOG_LEVEL'] ?? 'info'
  if (opts.pretty ?? process.env['LOG_PRETTY'] === '1') {
    return pino({ level, transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } })
  }
  // level словом (info/warn/error), а не числом: так его читают Loki и люди.
  return pino({
    level,
    base: { service: 'grammar-trainer-api' },
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  })
}

/** Логгер для тестов: ничего не пишет. */
export const silentLogger = (): Logger => pino({ level: 'silent' })

let sentryOn = false
/** Включает Sentry/GlitchTip, если задан DSN. Возвращает true, если включено. */
export function initSentry(dsn = process.env['SENTRY_DSN'], environment = process.env['NODE_ENV'] ?? 'development'): boolean {
  if (!dsn) return false
  Sentry.init({ dsn, environment, release: process.env['APP_BUILD'] ?? 'dev' })
  sentryOn = true
  return true
}

export function captureError(e: unknown, context: Record<string, unknown>): void {
  if (!sentryOn) return
  Sentry.withScope((scope) => {
    scope.setContext('request', context)
    if (typeof context['requestId'] === 'string') scope.setTag('requestId', context['requestId'])
    if (typeof context['userId'] === 'string') scope.setUser({ id: context['userId'] })
    Sentry.captureException(e)
  })
}
