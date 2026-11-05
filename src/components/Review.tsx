import type { Chapter, ExerciseBlock } from '../types'
import { useStore, isFirst } from '../store'
import { Exercise } from './Exercise'

/** Режим «Повторить ошибки»: все пункты, неверные в первой попытке. */
export function Review({ chapter }: { chapter: Chapter }) {
  const store = useStore()
  const wrong = new Map<string, Set<string>>()
  for (const a of store.attempts) {
    if (!isFirst(a) || a.correct) continue
    let set = wrong.get(a.exerciseId)
    if (!set) {
      set = new Set()
      wrong.set(a.exerciseId, set)
    }
    set.add(`${a.partIndex}|${a.itemN}`)
  }
  const exercises = chapter.blocks.filter(
    (b): b is ExerciseBlock => b.kind === 'exercise' && wrong.has(b.id),
  )
  return (
    <div className="review-page">
      <h2>Повторить ошибки</h2>
      {exercises.length === 0 ? (
        <p className="muted">Ошибок в первых попытках нет.</p>
      ) : (
        <>
          <p className="muted">Показаны только пункты с ошибками в первой попытке. Повторные попытки не меняют статистику темы.</p>
          {exercises.map((e) => (
            <Exercise key={e.id} block={e} book={chapter.book} check={chapter.check !== false} only={wrong.get(e.id)} />
          ))}
        </>
      )}
    </div>
  )
}
