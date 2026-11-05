// Кнопка «Сообщить о проблеме»: заметка пользователя + журнал последних действий → сервер или файл.
import { useState } from 'react'
import { sendReport } from '../report'

export function ReportButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    try {
      const r = await sendReport(note.trim())
      setStatus('id' in r ? `Отчёт №${String(r.id)} отправлен. Спасибо.` : `Сервер недоступен: отчёт сохранён в файл ${r.file}. Пришлите его разработчику.`)
      setNote('')
      setOpen(false)
    } catch (e) {
      setStatus(`Не удалось отправить: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className={`report ${className}`}>
      <button className="ghost" onClick={() => { setOpen((o) => !o); setStatus(null) }}>Сообщить о проблеме</button>
      {open && (
        <span className="report-form">
          <textarea value={note} placeholder="Что случилось? Что ожидали?" aria-label="Описание проблемы" rows={3} onChange={(e) => setNote(e.target.value)} />
          <button className="primary" disabled={busy || !note.trim()} onClick={() => void send()}>Отправить</button>
          <span className="muted small">Вместе с описанием уйдут последние действия в приложении (без ответов и токенов).</span>
        </span>
      )}
      {status && <span className="shared-note">{status}</span>}
    </span>
  )
}
