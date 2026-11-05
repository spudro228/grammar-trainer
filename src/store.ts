// Хранилище в localStorage. См. docs/MVP.md, раздел 7.
import { useSyncExternalStore } from 'react'
import type { Attempt, Drafts, ExerciseProgress, Review, Status } from './types'

const KEY = 'grammar-trainer:v1'

export interface State {
  attempts: Attempt[]
  progress: Record<string, ExerciseProgress>
  drafts: Drafts
  reviews: Record<string, Review>
}

const empty = (): State => ({ attempts: [], progress: {}, drafts: {}, reviews: {} })

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<State>
    return { ...empty(), ...parsed }
  } catch {
    return empty()
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l())
}

/** Текущее состояние вне React (синхронизация, тесты). */
export const getState = () => state

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const draftKey = (exerciseId: string, part: number, itemN: number, blank: number) =>
  `${exerciseId}|${part}|${itemN}|${blank}`

export function setDraft(key: string, value: string) {
  commit({ ...state, drafts: { ...state.drafts, [key]: value } })
}

export function clearDrafts(prefix: string) {
  const drafts: Drafts = {}
  for (const [k, v] of Object.entries(state.drafts)) if (!k.startsWith(prefix + '|')) drafts[k] = v
  commit({ ...state, drafts })
}

/** Номер следующей попытки для упражнения. */
export function nextAttemptNo(exerciseId: string): number {
  let max = 0
  for (const a of state.attempts) if (a.exerciseId === exerciseId && a.attemptNo > max) max = a.attemptNo
  return max + 1
}

/** Первая ли это попытка для пропуска (см. Attempt.first). Старые записи без поля: первая = attemptNo 1. */
export const isFirst = (a: Attempt) => a.first ?? a.attemptNo === 1

export function recordCheck(
  exerciseId: string,
  results: Omit<Attempt, 'ts' | 'attemptNo' | 'exerciseId' | 'first'>[],
  status: Status,
) {
  const ts = Date.now()
  const attemptNo = nextAttemptNo(exerciseId)
  const tried = new Set(
    state.attempts.filter((a) => a.exerciseId === exerciseId).map((a) => `${a.partIndex}|${a.itemN}|${a.blank}`),
  )
  const fresh = results.map((r) => ({ ...r, ts, attemptNo, exerciseId, first: !tried.has(`${r.partIndex}|${r.itemN}|${r.blank}`) }))
  const prev = state.progress[exerciseId]
  const firstTryCorrect = (prev?.firstTryCorrect ?? 0) + fresh.filter((r) => r.first && r.correct).length
  const firstTryTotal = (prev?.firstTryTotal ?? 0) + fresh.filter((r) => r.first).length
  const progress = {
    ...state.progress,
    [exerciseId]: { status, lastTs: ts, firstTryCorrect, firstTryTotal },
  }
  commit({ ...state, attempts: state.attempts.concat(fresh), progress })
}

export function markDone(exerciseId: string) {
  const prev = state.progress[exerciseId]
  commit({
    ...state,
    progress: {
      ...state.progress,
      [exerciseId]: {
        status: 'done',
        lastTs: Date.now(),
        firstTryCorrect: prev?.firstTryCorrect ?? 0,
        firstTryTotal: prev?.firstTryTotal ?? 0,
      },
    },
  })
}

export function setReview(review: Review) {
  commit({ ...state, reviews: { ...state.reviews, [review.exerciseId]: review } })
}

export function clearReview(exerciseId: string) {
  const reviews = { ...state.reviews }
  delete reviews[exerciseId]
  commit({ ...state, reviews })
}

export function resetExercise(exerciseId: string) {
  const progress = { ...state.progress }
  delete progress[exerciseId]
  const reviews = { ...state.reviews }
  delete reviews[exerciseId]
  const drafts: Drafts = {}
  for (const [k, v] of Object.entries(state.drafts)) if (!k.startsWith(exerciseId + '|')) drafts[k] = v
  commit({ ...state, progress, drafts, reviews })
}

export function exportJson(): string {
  return JSON.stringify(state, null, 2)
}

export function importJson(text: string) {
  const parsed = JSON.parse(text) as Partial<State>
  if (!Array.isArray(parsed.attempts)) throw new Error('Нет поля attempts')
  commit({ ...empty(), ...parsed })
}

export function resetAll() {
  commit(empty())
}
