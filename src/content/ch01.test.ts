// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ch01 } from './ch01'
import { isCorrect, checkSet } from '../check'
import type { ExerciseBlock } from '../types'

const exercises = ch01.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise')

describe('chapter 1 content', () => {
  it('has 46 exercises numbered in order and 9 charts', () => {
    expect(exercises.map((e) => e.number)).toEqual(Array.from({ length: 46 }, (_, i) => i + 1))
    expect(ch01.blocks.filter((b) => b.kind === 'chart').length).toBe(9)
  })

  for (const e of exercises) {
    e.parts.forEach((part, pi) => {
      if (part.type === 'info') return
      it(`Ex. ${e.number} part ${pi}: blanks match answers and key answers pass`, () => {
        for (const item of part.items) {
          if (part.type === 'set') {
            const r = checkSet(item.answers[0]!, item.prefilled ?? [], item.answers[0]!)
            expect(r.perBlank.every((m) => m === true)).toBe(true)
            expect(r.complete).toBe(true)
            continue
          }
          const nBlanks = part.type === 'choice' ? 1 : item.text.split('___').length - 1
          expect(item.answers.length, `item ${item.n} blanks`).toBe(nBlanks)
          if (part.type === 'choice') {
            expect(item.options?.length).toBeGreaterThan(1)
            for (const a of item.answers[0]!) expect(item.options).toContain(a)
          }
          item.answers.forEach((accepted, b) => {
            for (const a of accepted) {
              expect(isCorrect(a, accepted, part.contractionsFree), `item ${item.n} blank ${b} "${a}"`).toBe(true)
            }
          })
        }
      })
    })
  }

  it('counts checkable exercises', () => {
    const checkable = exercises.filter((e) =>
      e.parts.some((p) => p.type !== 'info' && p.items.some((it) => !it.example && it.answers.some((a) => a.length > 0))),
    )
    expect(checkable.length).toBe(30)
  })
})
