// Отправка отчёта о проблеме: на сервер, а если его нет — в файл JSON для пересылки вручную.
import { api, ApiRequestError } from './api'
import { buildReport, log } from './log'

let autoSent = 0

export async function sendReport(note: string): Promise<{ id: number } | { file: string }> {
  const report = buildReport(note)
  try {
    const r = await api.report(report)
    log('info', 'report sent', { id: r.id })
    return { id: r.id }
  } catch (e) {
    if (!(e instanceof ApiRequestError && e.status === 0)) throw e
    const name = `grammar-trainer-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return { file: name }
  }
}

/** Автоматический отчёт при сбое: не чаще трёх за сессию, ошибки отправки глотаются. */
export function autoReport(reason: string): void {
  if (autoSent >= 3) return
  autoSent++
  api.report(buildReport(`auto: ${reason}`)).catch(() => undefined)
}

/** Для тестов. */
export function resetAutoReport() {
  autoSent = 0
}
