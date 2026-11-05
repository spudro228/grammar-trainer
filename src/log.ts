// Журнал клиента: кольцевой буфер последних событий (переходы, действия, запросы, ошибки).
// Уходит на сервер вместе с отчётом о проблеме (кнопка «Сообщить о проблеме» или автоматически при сбое).
import type { ClientLogEvent, ClientLogKind, ClientReportInput } from '../shared/api'

const MAX = 300
const STORAGE = 'grammar-trainer:log'
let events: ClientLogEvent[] = restore()
let onChange: (() => void) | null = null

function restore(): ClientLogEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE)
    return raw ? (JSON.parse(raw) as ClientLogEvent[]).slice(-MAX) : []
  } catch {
    return []
  }
}
function persist() {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify(events.slice(-100)))
  } catch {
    /* ignore */
  }
}

export const BUILD: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'

/** Пишет событие. `data` должно быть сериализуемым и небольшим: без ответов ученика и токенов. */
export function log(kind: ClientLogKind, msg: string, data?: unknown): void {
  const e: ClientLogEvent = data === undefined ? { t: Date.now(), kind, msg } : { t: Date.now(), kind, msg, data }
  events.push(e)
  if (events.length > MAX) events = events.slice(-MAX)
  persist()
  onChange?.()
  if (kind === 'error' && import.meta.env.DEV && import.meta.env.MODE !== 'test') console.error('[log]', msg, data)
}

export const getLog = (): readonly ClientLogEvent[] => events
export function clearLog() {
  events = []
  persist()
}

/** Описание ошибки для журнала: сообщение и стек без лишнего. */
export function describeError(e: unknown): { message: string; stack?: string } {
  if (e instanceof Error) {
    const out: { message: string; stack?: string } = { message: `${e.name}: ${e.message}` }
    if (e.stack) out.stack = e.stack.split('\n').slice(0, 12).join('\n')
    return out
  }
  return { message: String(e) }
}

/** Собирает отчёт из журнала. */
export function buildReport(note: string): ClientReportInput {
  return {
    note,
    url: window.location.href,
    userAgent: navigator.userAgent,
    build: BUILD,
    events: events.slice(-MAX),
  }
}

/** Глобальные обработчики: необработанные ошибки и промисы попадают в журнал и вызывают `onError`. */
export function installGlobalHandlers(onError: (e: unknown) => void): void {
  window.addEventListener('error', (ev) => {
    log('error', 'window.error', { ...describeError(ev.error ?? ev.message), file: ev.filename, line: ev.lineno })
    onError(ev.error ?? ev.message)
  })
  window.addEventListener('unhandledrejection', (ev) => {
    log('error', 'unhandledrejection', describeError(ev.reason))
    onError(ev.reason)
  })
  onChange = null
}
