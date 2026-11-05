// Разбор проверенного преподавателем файла exercise-<id>-checked.html
// или exercises-<первое>--<последнее>-checked.html с несколькими заданиями.
import type { Review } from './types'
import { isReview } from '../shared/api'

/** Возвращает проверку из HTML-файла или бросает ошибку с понятным текстом. */
export function parseReviewFile(html: string): Review {
  const [first] = parseReviewFiles(html)
  if (!first) throw new Error('В файле нет идентификатора упражнения')
  return first
}

/**
 * Проверки всех заданий файла. В файле с несколькими заданиями каждое получает
 * свои пометки (по префиксу ключа), а комментарий и рукописные пометки — общие.
 */
export function parseReviewFiles(html: string): Review[] {
  const m = /<script[^>]*id="review"[^>]*>([\s\S]*?)<\/script>/.exec(html)
  if (!m) throw new Error('Это не файл проверки: нет блока review')
  let data: Partial<Review> & { exerciseIds?: unknown }
  try {
    data = JSON.parse((m[1] ?? '').trim()) as Partial<Review> & { exerciseIds?: unknown }
  } catch {
    throw new Error('Блок review повреждён')
  }
  if (!data.exerciseId) throw new Error('В файле нет идентификатора упражнения')
  if (!data.checkedAt) throw new Error('Файл ещё не проверен: преподаватель не нажал «Сохранить проверку»')
  const review = {
    exerciseId: data.exerciseId,
    checkedAt: data.checkedAt,
    marks: data.marks ?? {},
    comment: data.comment ?? '',
    ink: data.ink ?? null,
    inkW: data.inkW ?? 0,
    inkH: data.inkH ?? 0,
  }
  if (!isReview(review)) throw new Error('Блок review повреждён')
  const ids = Array.isArray(data.exerciseIds) ? data.exerciseIds.filter((x): x is string => typeof x === 'string' && x !== '') : []
  if (ids.length < 2) return [review]
  return ids.map((id) => ({
    ...review,
    exerciseId: id,
    marks: Object.fromEntries(Object.entries(review.marks).filter(([k]) => k.startsWith(id + '|'))),
  }))
}
