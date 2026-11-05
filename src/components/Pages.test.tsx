import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Exercise } from './Exercise'
import { Progress } from './Progress'
import { Review } from './Review'
import { ch01 } from '../content/ch01'
import { resetAll, getState } from '../store'
import type { ExerciseBlock } from '../types'

const ex = (n: number) => ch01.blocks.find((b) => b.kind === 'exercise' && b.number === n) as ExerciseBlock

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetAll()
})

function solveEx4WithOneError() {
  const { unmount } = render(<Exercise block={ex(4)} book="Book" />)
  const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
  ;['are', 'is', 'is', 'am', 'xx'].forEach((v, i) => fireEvent.change(inputs[i + 1]!, { target: { value: v } }))
  fireEvent.click(screen.getByText('Проверить'))
  unmount()
}

describe('Progress page', () => {
  it('shows first-try accuracy per chart and the error list', () => {
    solveEx4WithOneError()
    render(<Progress chapter={ch01} onOpen={() => {}} />)
    expect(screen.getByText('Выполнено упражнений: 0 / 46')).toBeTruthy()
    expect(screen.getByText('80 %')).toBeTruthy() // chart 1-1: 4 из 5
    expect(screen.getByText('xx')).toBeTruthy()
    expect(screen.getAllByText('is').length).toBeGreaterThan(0)
  })
})

describe('Review page', () => {
  it('lists only wrong first-try items and keeps status after re-check', () => {
    solveEx4WithOneError()
    render(<Review chapter={ch01} />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    expect(inputs.length).toBe(1) // только пункт 6
    expect(inputs[0]!.value).toBe('xx')
    fireEvent.change(inputs[0]!, { target: { value: 'is' } })
    fireEvent.click(screen.getByText('Проверить'))
    expect(inputs[0]!.className).toContain('ok')
    const state = getState()
    expect(state.progress['1.04']).toMatchObject({ status: 'partial', firstTryCorrect: 4, firstTryTotal: 5 })
    expect(state.attempts.at(-1)).toMatchObject({ attemptNo: 2, correct: true })
  })
})
