// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mnn20 } from './mnn20'
import { isCorrect } from '../check'
import type { ExerciseBlock } from '../types'

const exercises = mnn20.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise')
const blanksOf = (t: string) => t.split('___').length - 1

describe('第20課 content', () => {
  it('has unique ids and labels, charts exist', () => {
    const ids = new Set(exercises.map((e) => e.id))
    expect(ids.size).toBe(exercises.length)
    const charts = mnn20.blocks.filter((b) => b.kind === 'chart').map((b) => b.id)
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
  it('choice answers are among the options', () => {
    for (const e of exercises)
      for (const part of e.parts)
        if (part.type === 'choice')
          for (const item of part.items) expect(item.options, `${e.id} ${item.n}`).toContain(item.answers[0]?.[0])
  })
  it('counts checkable exercises', () => {
    const checkable = exercises.filter((e) => e.parts.some((p) => p.type !== 'info' && p.items.some((i) => i.answers.some((a) => a.length > 0))))
    expect(exercises.length).toBe(20)
    expect(checkable.length).toBe(16)
  })
})
