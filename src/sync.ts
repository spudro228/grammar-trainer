// Обмен с сервером: состояние ученика, отправка работ, получение проверок.
import { api } from './api'
import { exportJson, importJson, getState, setReview } from './store'
import { exerciseToHtml, exerciseToText } from './export'
import type { ExerciseBlock } from './types'

export async function pushState(studentId: string): Promise<string> {
  const r = await api.putState(studentId, JSON.parse(exportJson()) as unknown)
  return r.updatedAt
}

export async function pullState(studentId: string): Promise<string> {
  const r = await api.getState(studentId)
  importJson(JSON.stringify(r.data))
  return r.updatedAt
}

/** Загружает проверки с сервера. Возвращает число новых или обновлённых. */
export async function pullReviews(studentId: string): Promise<number> {
  const reviews = await api.myReviews(studentId)
  let n = 0
  const have = getState().reviews
  for (const r of reviews) {
    const prev = have[r.exerciseId]
    if (prev && prev.checkedAt >= r.checkedAt) continue
    setReview(r)
    n++
  }
  return n
}

/** Отправляет несколько упражнений по очереди, каждое отдельной работой. Возвращает отправленные и не отправленные с причиной. */
export async function submitExercises(studentId: string, blocks: ExerciseBlock[], drafts: Record<string, string>, book: string) {
  const sent: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const block of blocks) {
    try {
      await submitExercise(studentId, block, drafts, book)
      sent.push(block.id)
    } catch (e) {
      failed.push({ id: block.id, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { sent, failed }
}

export function submitExercise(studentId: string, block: ExerciseBlock, drafts: Record<string, string>, book: string) {
  return api.submit(studentId, {
    exerciseId: block.id,
    book,
    html: exerciseToHtml(block, drafts, book),
    text: exerciseToText(block, drafts, book),
  })
}
