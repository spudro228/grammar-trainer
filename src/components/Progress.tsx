import type { Chapter, ExerciseBlock } from '../types'
import { chartIds, refsToCharts } from '../chartRefs'
import { useStore } from '../store'

const WEAK = 0.8

export function Progress({ chapter, onOpen }: { chapter: Chapter; onOpen: (exerciseId: string) => void }) {
  const store = useStore()
  const charts = chartIds(chapter)
  const exercises = chapter.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise')
  const titleOf = (id: string) => {
    const b = chapter.blocks.find((x) => x.kind === 'chart' && x.id === id)
    return b?.kind === 'chart' ? b.title.replace(/<[^>]+>/g, '') : ''
  }

  const rows = charts.map((id) => {
    const exs = exercises.filter((e) => refsToCharts(e.charts, charts).includes(id))
    let done = 0, c = 0, t = 0
    for (const e of exs) {
      const p = store.progress[e.id]
      if (p?.status === 'done') done++
      c += p?.firstTryCorrect ?? 0
      t += p?.firstTryTotal ?? 0
    }
    return { id, title: titleOf(id), total: exs.length, done, acc: t ? c / t : null }
  })

  const totalDone = exercises.filter((e) => store.progress[e.id]?.status === 'done').length
  const errors = store.attempts.filter((a) => !a.correct).slice(-50).reverse()
  const exById = new Map(exercises.map((e) => [e.id, e]))

  return (
    <div className="progress-page">
      <h2>Прогресс. {chapter.heading ?? `Chapter ${chapter.number}`}{chapter.title ? `: ${chapter.title}` : ''}</h2>
      <p>Выполнено упражнений: {totalDone} / {exercises.length}</p>
      <table className="stats">
        <thead>
          <tr><th>Chart</th><th>Тема</th><th>Упражнений</th><th>Выполнено</th><th>Точность первой попытки</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.acc !== null && r.acc < WEAK ? 'weak' : ''}>
              <td>{r.id}</td>
              <td>{r.title}</td>
              <td>{r.total}</td>
              <td>{r.done}</td>
              <td>{r.acc === null ? '—' : `${Math.round(r.acc * 100)} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Красным выделены темы с точностью первой попытки ниже {WEAK * 100} %.</p>

      <h3>Последние ошибки</h3>
      {errors.length === 0 ? (
        <p className="muted">Ошибок нет.</p>
      ) : (
        <table className="stats">
          <thead>
            <tr><th>Упражнение</th><th>Пункт</th><th>Мой ответ</th><th>Верный ответ</th><th>Попытка</th><th>Дата</th></tr>
          </thead>
          <tbody>
            {errors.map((a, i) => {
              const e = exById.get(a.exerciseId)
              const item = e?.parts[a.partIndex]?.items.find((it) => it.n === a.itemN)
              const answer = item?.answers[a.blank]?.join(' / ') ?? '—'
              return (
                <tr key={i}>
                  <td><a href="#" onClick={(ev) => { ev.preventDefault(); onOpen(a.exerciseId) }}>{e ? (e.label ?? `Ex. ${e.number}`) : a.exerciseId}</a></td>
                  <td>{a.itemN}{item && (item.answers.length > 1 ? `.${a.blank + 1}` : '')}</td>
                  <td className="wrong">{a.answer || '(пусто)'}</td>
                  <td>{answer}</td>
                  <td>{a.attemptNo}</td>
                  <td>{new Date(a.ts).toLocaleString('ru-RU')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
