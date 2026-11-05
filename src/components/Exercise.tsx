import { useRef, useState } from 'react'
import type { ExerciseBlock, Item, Part, Status } from '../types'
import { isCorrect, checkSet, normalize, NOTHING } from '../check'
import { useStore, draftKey, setDraft, recordCheck, markDone, resetExercise, setReview } from '../store'
import { parseReviewFiles } from '../review'
import type { Review } from '../types'
import { Html } from './Html'
import { exerciseToText, exerciseToHtml, shareExercise, exportFileName } from '../export'
import { useStudent } from '../online'
import { submitExercise } from '../sync'
import { describeError, log } from '../log'

type Mark = boolean | null // true верно, false неверно, null пусто
type Marks = Record<string, Mark>
type Result = Parameters<typeof recordCheck>[1][number]

interface Props {
  block: ExerciseBlock
  /** Название учебника для выгрузки преподавателю. */
  book: string
  /** false — без автопроверки: только «Для преподавателя» и «Выполнено». */
  check?: boolean
  /** Режим повторения: показывать только пункты из набора `${partIndex}|${itemN}`. */
  only?: Set<string> | undefined
  /** Выбор для отправки нескольких заданий сразу. Без onSelect галочки нет. */
  selected?: boolean
  onSelect?: (on: boolean) => void
}

/** Задание можно отправить преподавателю: в нём есть что заполнять. */
export const isSendable = (block: ExerciseBlock) => block.parts.some((p) => p.type !== 'info')

const blanksOf = (text: string) => text.split('___').length - 1

function isCheckable(part: Part) {
  return part.type !== 'info' && part.items.some((it) => !it.example && it.answers.some((a) => a.length > 0))
}

/** В части есть пропуск, который по правилу остаётся пустым (ответ ''). Тогда у полей есть кнопка «Ø». */
function allowsNothing(part: Part) {
  return part.items.some((it) => it.answers.some((a) => a.includes('')))
}

const showAnswer = (a: string, no = NOTHING) => (a === '' ? no : a)

export function Exercise({ block, book, only, check = true, selected = false, onSelect }: Props) {
  const store = useStore()
  const student = useStudent()
  const [marks, setMarks] = useState<Marks>({})
  const [reveal, setReveal] = useState(false)
  const [shared, setShared] = useState<string | null>(null)
  const reviewInput = useRef<HTMLInputElement>(null)
  const teacherReview: Review | undefined = store.reviews[block.id]
  const progress = store.progress[block.id]
  const status: Status = progress?.status ?? 'new'
  const checkable = check && block.parts.some(isCheckable)
  const review = !!only

  const visibleItems = (pi: number, part: Part) =>
    review ? part.items.filter((it) => only.has(`${pi}|${it.n}`)) : part.items

  /** Проверяет один пункт. Пустые поля не считаются ошибкой: отметка null, записи нет. */
  function checkItem(pi: number, part: Part, item: Item, marks: Marks, results: Result[]): { empty: boolean } {
    let empty = false
    if (part.type === 'set') {
      const n = item.blanks ?? 0
      const values = Array.from({ length: n }, (_, b) => store.drafts[draftKey(block.id, pi, item.n, b)] ?? '')
      const r = checkSet(values, item.prefilled ?? [], item.answers[0] ?? [])
      r.perBlank.forEach((m, b) => {
        marks[draftKey(block.id, pi, item.n, b)] = m
        if (m !== null) results.push({ partIndex: pi, itemN: item.n, blank: b, answer: values[b] ?? '', correct: m })
      })
      return { empty: !r.complete }
    }
    const nBlanks = part.type === 'choice' ? 1 : blanksOf(item.text)
    for (let b = 0; b < nBlanks; b++) {
      const accepted = item.answers[b] ?? []
      if (accepted.length === 0) continue // свободный ответ
      const key = draftKey(block.id, pi, item.n, b)
      const value = store.drafts[key] ?? ''
      if (normalize(value, part.ja) === '') {
        marks[key] = null
        empty = true
        continue
      }
      const correct = isCorrect(value, accepted, part.contractionsFree, part.ja)
      marks[key] = correct
      results.push({ partIndex: pi, itemN: item.n, blank: b, answer: value, correct })
    }
    return { empty }
  }

  function checkAll() {
    log('action', 'check', { exercise: block.id })
    const results: Result[] = []
    const next: Marks = {}
    let empty = false
    for (const [pi, part] of block.parts.entries()) {
      if (part.type === 'info') continue
      for (const item of visibleItems(pi, part)) {
        if (item.example) continue
        if (checkItem(pi, part, item, next, results).empty) empty = true
      }
    }
    setMarks(next)
    if (results.length === 0) return // ничего не заполнено
    const allOk = !empty && results.every((r) => r.correct)
    const newStatus: Status = review ? (status === 'new' ? 'partial' : status) : (allOk ? 'done' : 'partial')
    recordCheck(block.id, results, newStatus)
  }

  function checkOne(pi: number, part: Part, item: Item) {
    const results: Result[] = []
    const next: Marks = {}
    checkItem(pi, part, item, next, results)
    setMarks((prev) => ({ ...prev, ...next }))
    if (results.length === 0) return
    recordCheck(block.id, results, status === 'new' ? 'partial' : status)
  }

  async function share() {
    log('action', 'share', { exercise: block.id })
    const ok = await shareExercise(
      exerciseToHtml(block, store.drafts, book),
      exerciseToText(block, store.drafts, book),
      `${exportFileName(block)}.html`,
    )
    setShared(ok ? 'Файл сохранён, текст в буфере обмена' : 'Файл сохранён')
    setTimeout(() => setShared(null), 3000)
  }

  async function submit() {
    if (!student) return
    log('action', 'submit', { exercise: block.id })
    try {
      await submitExercise(student.id, block, store.drafts, book)
      setShared('Отправлено преподавателю')
    } catch (e) {
      setShared(`Не отправлено: ${e instanceof Error ? e.message : String(e)}`)
    }
    setTimeout(() => setShared(null), 4000)
  }

  async function loadReview(file: File | undefined) {
    if (!file) return
    try {
      const all = parseReviewFiles(await file.text())
      if (!all.some((r) => r.exerciseId === block.id)) throw new Error(`Файл для другого упражнения: ${all.map((r) => r.exerciseId).join(', ')}`)
      // В файле с несколькими заданиями проверка загружается сразу во все.
      all.forEach(setReview)
      setShared(all.length > 1 ? `Проверка загружена: заданий ${String(all.length)}` : 'Проверка загружена')
      log('action', 'review loaded', { exercise: block.id })
    } catch (e) {
      log('error', 'review load failed', { exercise: block.id, ...describeError(e) })
      alert(`Не удалось загрузить проверку: ${(e as Error).message}`)
    }
    setTimeout(() => setShared(null), 3000)
  }

  function reset() {
    log('action', 'reset', { exercise: block.id })
    resetExercise(block.id)
    setMarks({})
    setReveal(false)
  }

  return (
    <section className={`exercise status-${status}`} id={`ex-${block.id}`}>
      <h3 className="ex-head">
        {onSelect && isSendable(block) ? (
          <input
            type="checkbox"
            className="ex-select"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            title="Выбрать для отправки преподавателю"
            aria-label={`Выбрать ${exerciseNameText(block)}`}
          />
        ) : (
          <span className="ex-check">❑</span>
        )}{' '}
        <Html html={exerciseName(block)} />{' '}
        <span className="ex-charts">({block.charts})</span>
        {teacherReview && <span className="badge badge-review">проверено</span>}
        <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
      </h3>
      {block.parts.map((part, pi) => (
        <div className="part" key={pi}>
          {part.audio && (
            <p className="audio-note">
              <span className="audio-icon" aria-hidden="true">🔊</span> <b>{part.audio}</b> Прослушайте аудио: без него задание не выполнить.
            </p>
          )}
          <p className="instruction">
            {part.label && <b className="part-label">{part.label} </b>}
            <Html html={part.instruction} />
          </p>
          {part.box && (
            <div className="wordbox">
              {part.box.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          )}
          {part.text && <Html as="div" className="part-text" html={part.text} />}
          {part.image && <img className="ex-img" src={part.image} alt="" />}
          {part.columns && (
            <div className="columns-head">
              {part.columns.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          )}
          {part.type === 'set' ? (
            <SetTable block={block} pi={pi} part={part} marks={marks} reveal={reveal && check} drafts={store.drafts} check={check} />
          ) : (
            <ol className={`items items-${part.type} ${part.items.some((it) => blanksOf(it.text) > 1) ? 'items-wide' : ''}`}>
              {visibleItems(pi, part).map((item) => (
                <li key={item.n} value={item.n} className={item.example ? 'example' : ''}>
                  <ItemView block={block} pi={pi} part={part} item={item} marks={marks} reveal={reveal} drafts={store.drafts} check={check} review={teacherReview} />
                  {check && !item.example && item.answers.some((a) => a.length > 0) && (
                    <button
                      type="button"
                      className="check-item"
                      title="Проверить этот пункт"
                      aria-label={`Проверить пункт ${item.n}`}
                      onClick={() => checkOne(pi, part, item)}
                    >
                      ✓
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
      <div className="actions">
        {checkable && (
          <>
            <button className="primary" onClick={checkAll}>Проверить</button>
            <button onClick={() => setReveal((r) => !r)}>{reveal ? 'Скрыть ответы' : 'Показать ответы'}</button>
          </>
        )}
        {!checkable && status !== 'done' && <button className="primary" onClick={() => markDone(block.id)}>Выполнено</button>}
        {isSendable(block) && (
          <>
            {student && (
              <button className="primary" onClick={() => void submit()} title="Отправить задание с моими ответами на сервер преподавателю">
                Отправить преподавателю
              </button>
            )}
            <button onClick={() => void share()} title="Сохранить задание с моими ответами в файл для проверки преподавателем">
              Для преподавателя
            </button>
            <button onClick={() => reviewInput.current?.click()} title="Загрузить файл exercise-…-checked.html от преподавателя">
              Загрузить проверку
            </button>
            <input ref={reviewInput} type="file" accept=".html,text/html" hidden onChange={(e) => { void loadReview(e.target.files?.[0]); e.target.value = '' }} />
          </>
        )}
        {!review && <button className="ghost" onClick={reset}>Сбросить</button>}
        {shared && <span className="shared-note">{shared}</span>}
      </div>
      {teacherReview && <ReviewBox review={teacherReview} />}
    </section>
  )
}

function ReviewBox({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="review-box">
      <div className="review-head">Проверено преподавателем {new Date(review.checkedAt).toLocaleString('ru-RU')}</div>
      {review.comment && <p className="review-comment">{review.comment}</p>}
      {review.ink && (
        <>
          <button className="ghost" onClick={() => setOpen((o) => !o)}>{open ? 'Скрыть рукописные пометки' : 'Показать рукописные пометки'}</button>
          {open && <img className="review-ink" src={review.ink} alt="Рукописные пометки преподавателя" />}
        </>
      )}
    </div>
  )
}

/** "Exercise 4. Looking at grammar." или "練習B 1." */
/** Название с разметкой (в заголовке может быть фуригана `<ruby>`). Выводить через <Html>. */
export function exerciseName(block: ExerciseBlock, short = false) {
  const head = block.label ?? `${short ? 'Ex.' : 'Exercise'} ${block.number}`
  return block.title ? `${head}. ${block.title}.` : `${head}.`
}
/** Название без разметки: для aria-label и текстовых выгрузок. */
export const exerciseNameText = (block: ExerciseBlock, short = false) => exerciseName(block, short).replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '')

function statusLabel(s: Status) {
  return s === 'done' ? 'выполнено' : s === 'partial' ? 'есть ошибки' : 'не начато'
}

interface ItemProps {
  block: ExerciseBlock
  check: boolean
  review: Review | undefined
  pi: number
  part: Part
  item: Item
  marks: Marks
  reveal: boolean
  drafts: Record<string, string>
}

function ItemView({ block, pi, part, item, marks, reveal, drafts, check, review }: ItemProps) {
  const segments = item.text.split('___')
  if (part.type === 'choice') {
    const key = draftKey(block.id, pi, item.n, 0)
    const value = item.example ? (item.answers[0]?.[0] ?? '') : (drafts[key] ?? '')
    const mark = marks[key]
    const free = (item.answers[0] ?? []).length === 0
    const rm = review?.marks[key]
    return (
      <span className="item-choice">
        {/* Выбранный вариант встаёт на место пропуска, пустой пропуск подчёркнут. */}
        {segments.map((seg, i) => (
          <span key={i}>
            <Html html={seg} />
            {i === 0 && segments.length > 1 && (
              <span className={`choice-slot ${value ? 'filled' : ''} ${markClass(mark)} ${part.ja ? 'ja' : ''}`} data-testid={`slot-${key}`}>
                {value || '\u00a0'}
              </span>
            )}
          </span>
        ))}
        <span className={`options ${markClass(mark)} ${rm?.wrong ? 'rv-wrong' : ''}`}>
          {(item.options ?? []).map((o) => (
            <label key={o} className={value === o ? 'selected' : ''}>
              <input
                type="radio"
                name={key}
                value={o}
                checked={value === o}
                disabled={item.example}
                onChange={() => setDraft(key, o)}
              />
              {o}
            </label>
          ))}
        </span>
        {check && !free && (reveal || mark === false) && !item.example && <span className="answer">{(item.answers[0] ?? []).join(' / ')}</span>}
        {rm?.fix && <span className="rv-fix">{rm.fix}</span>}
      </span>
    )
  }
  return (
    <span className="item-fill">
      {segments.map((seg, i) => (
        <span key={i}>
          <Html html={seg.replace(' | ', '<span class="col-sep"></span>')} />
          {i < segments.length - 1 && (
            <Blank
              blank={i}
              block={block}
              pi={pi}
              part={part}
              item={item}
              marks={marks}
              reveal={reveal}
              drafts={drafts}
              check={check}
              review={review}
            />
          )}
        </span>
      ))}
    </span>
  )
}

function Blank({ blank, block, pi, part, item, marks, reveal, drafts, check, review }: ItemProps & { blank: number }) {
  const key = draftKey(block.id, pi, item.n, blank)
  const accepted = item.answers[blank] ?? []
  const free = accepted.length === 0
  const value = item.example ? showAnswer(accepted[0] ?? '', part.nothing) : drafts[key] ?? ''
  const mark = marks[key]
  const hint = check && !free && !item.example && (reveal || mark === false)
  const rm = review?.marks[key]
  const longest = Math.max(free ? 16 : 6, ...accepted.map((a) => a.length + 2))
  const width = part.type === 'rewrite' ? Math.max(40, longest) : Math.min(longest, 36)
  const nothing = !free && !item.example && allowsNothing(part)
  const NO = part.nothing ?? NOTHING
  return (
    <>
      <input
        className={`blank ${markClass(mark)} ${free ? 'free' : ''} ${part.ja ? 'ja' : ''} ${rm?.wrong ? 'rv-wrong' : ''}`}
        style={{ width: `${part.ja ? Math.max(8, Math.round(width * 1.5)) : width}ch` }}
        value={value}
        disabled={item.example}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(key, e.target.value)}
      />
      {nothing && (
        <button
          type="button"
          className={`nothing ${value === NO ? 'selected' : ''}`}
          title="Ничего: пропуск остаётся пустым по правилу"
          aria-label={`Ничего, пункт ${item.n}`}
          onClick={() => setDraft(key, value === NO ? '' : NO)}
        >
          {NO}
        </button>
      )}
      {hint && <span className="answer">{accepted.map((a) => showAnswer(a, part.nothing)).join(' / ')}</span>}
      {rm?.fix && <span className="rv-fix">{rm.fix}</span>}
    </>
  )
}

function SetTable({ block, pi, part, marks, reveal, drafts }: Omit<ItemProps, 'item' | 'review'>) {
  const rows = Math.max(...part.items.map((it) => it.blanks ?? 0))
  return (
    <table className="set-table">
      <thead>
        <tr>
          {part.items.map((it) => (
            <th key={it.n}>{it.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {part.items.map((it) => {
              const pre = it.prefilled ?? []
              if (r < pre.length) return <td key={it.n}><input className="blank" value={pre[r]} disabled /></td>
              const b = r - pre.length
              if (b >= (it.blanks ?? 0) - pre.length) return <td key={it.n} />
              const key = draftKey(block.id, pi, it.n, b)
              return (
                <td key={it.n}>
                  <input
                    className={`blank ${markClass(marks[key])}`}
                    value={drafts[key] ?? ''}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => setDraft(key, e.target.value)}
                              />
                </td>
              )
            })}
          </tr>
        ))}
        {reveal && (
          <tr className="answer-row">
            {part.items.map((it) => (
              <td key={it.n}><span className="answer">{(it.answers[0] ?? []).join(', ')}</span></td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  )
}

function markClass(m: Mark | undefined) {
  return m === true ? 'ok' : m === false ? 'bad' : m === null ? 'empty' : ''
}
