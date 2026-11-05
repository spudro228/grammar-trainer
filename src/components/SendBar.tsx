import { useState } from 'react'
import type { ExerciseBlock } from '../types'
import { useStore } from '../store'
import { useStudent } from '../online'
import { submitExercises } from '../sync'
import { shareExercises } from '../export'
import { log } from '../log'

interface Props {
  /** Выбранные задания в порядке главы. */
  blocks: ExerciseBlock[]
  /** Сколько заданий главы можно выбрать. */
  total: number
  book: string
  onSelectAll: () => void
  /** Снять выбор с заданий; без аргумента — со всех. */
  onClear: (ids?: string[]) => void
}

/** Панель внизу главы: отправка выбранных заданий преподавателю. */
export function SendBar({ blocks, total, book, onSelectAll, onClear }: Props) {
  const store = useStore()
  const student = useStudent()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function submit() {
    if (!student) return
    setBusy(true)
    log('action', 'submit batch', { count: blocks.length })
    const { sent, failed } = await submitExercises(student.id, blocks, store.drafts, book)
    setBusy(false)
    onClear(sent)
    setNote(
      failed.length === 0
        ? `Отправлено преподавателю: ${String(sent.length)}`
        : `Отправлено ${String(sent.length)} из ${String(blocks.length)}. Не отправлено: ${failed.map((f) => `${f.id} (${f.error})`).join(', ')}`,
    )
    if (failed.length === 0) setTimeout(() => setNote(null), 4000)
  }

  async function share() {
    log('action', 'share batch', { count: blocks.length })
    setBusy(true)
    const ok = await shareExercises(blocks, store.drafts, book)
    setBusy(false)
    setNote(`Файл сохранён, заданий в нём: ${String(blocks.length)}${ok ? ', текст в буфере обмена' : ''}`)
    setTimeout(() => setNote(null), 4000)
  }

  if (blocks.length === 0 && !note) return null
  return (
    <div className="send-bar" role="region" aria-label="Отправка выбранных заданий">
      {blocks.length > 0 && (
        <>
          <span className="send-count">Выбрано заданий: {blocks.length}</span>
          {student && (
            <button className="primary" disabled={busy} onClick={() => void submit()} title="Отправить выбранные задания с моими ответами на сервер преподавателю">
              Отправить преподавателю
            </button>
          )}
          <button disabled={busy} onClick={() => void share()} title="Сохранить выбранные задания одним файлом для проверки преподавателем">
            Для преподавателя
          </button>
          {blocks.length < total && <button className="ghost" disabled={busy} onClick={onSelectAll}>Выбрать все ({total})</button>}
          <button className="ghost" disabled={busy} onClick={() => onClear()}>Снять выбор</button>
        </>
      )}
      {note && <span className="send-note">{note}</span>}
    </div>
  )
}
