// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mnn05 } from './mnn05'
import { isCorrect, normalizeJa } from '../check'
import type { ExerciseBlock } from '../types'

const exercises = mnn05.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise')
const blanksOf = (t: string) => t.split('___').length - 1

describe('第5課 content', () => {
  it('has unique ids and labels, charts exist', () => {
    const ids = new Set(exercises.map((e) => e.id))
    expect(ids.size).toBe(exercises.length)
    const charts = mnn05.blocks.filter((b) => b.kind === 'chart').map((b) => b.id)
    expect(charts).toEqual(['文型', '例文', '会話', '練習A'])
    for (const e of exercises) expect(charts.some((c) => e.charts.includes(c)), e.id).toBe(true)
  })
  it('blank count equals answer count; key answers pass the check', () => {
    for (const e of exercises)
      for (const part of e.parts)
        for (const item of part.items) {
          if (part.type === 'info') continue
          expect(blanksOf(item.text), `${e.id} item ${item.n}`).toBe(item.answers.length)
          for (const accepted of item.answers)
            for (const a of accepted) expect(isCorrect(a, accepted, false, true), `${e.id} ${item.n} ${a}`).toBe(true)
        }
  })
  it('japanese normalization', () => {
    expect(normalizeJa('郵便局へ 行きます。')).toBe('郵便局へ行きます')
    expect(normalizeJa('……スーパーへ　行きました。')).toBe('スーパーへ行きました')
    expect(isCorrect('９がつ１４か に いきます', ['9月14日に行きます', '9がつ14かにいきます'], false, true)).toBe(true)
    expect(isCorrect('×', [''], false, true)).toBe(true)
  })
  it('counts checkable exercises', () => {
    const checkable = exercises.filter((e) => e.parts.some((p) => p.type !== 'info' && p.items.some((i) => i.answers.some((a) => a.length > 0))))
    expect(exercises.length).toBe(20)
    expect(checkable.length).toBe(16)
  })
})
