import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Exercise } from './Exercise'
import { ch01 } from '../content/ch01'
import { mnn06 } from '../content/mnn06'
import { exerciseToHtml } from '../export'
import { resetAll, getState } from '../store'
import type { ExerciseBlock } from '../types'

const ex = (n: number) => ch01.blocks.find((b) => b.kind === 'exercise' && b.number === n) as ExerciseBlock

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetAll()
})

describe('Exercise 4 (fill)', () => {
  it('highlights right and wrong blanks, records attempts, sets status', () => {
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    // пункт 1 — пример, заблокирован
    expect(inputs[0]!.disabled).toBe(true)
    fireEvent.change(inputs[1]!, { target: { value: 'are' } }) // верно
    fireEvent.change(inputs[2]!, { target: { value: 'are' } }) // неверно (is)
    fireEvent.click(screen.getByText('Проверить'))
    expect(inputs[1]!.className).toContain('ok')
    expect(inputs[2]!.className).toContain('bad')
    expect(inputs[3]!.className).toContain('empty')
    expect(screen.getByText('есть ошибки')).toBeTruthy()
    // пустые поля не записываются и не считаются ошибкой
    const state = getState()
    expect(state.attempts.length).toBe(2)
    expect(state.attempts.filter((a) => a.correct).length).toBe(1)
    expect(state.progress['1.04']).toMatchObject({ status: 'partial', firstTryCorrect: 1, firstTryTotal: 2 })
    // верный ответ показан рядом с ошибочным полем
    expect(screen.getAllByText('is').length).toBeGreaterThan(0)
  })

  it('marks done when all correct; second check does not change first-try stats', () => {
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    ;['are', 'is', 'is', 'am', 'is'].forEach((v, i) => fireEvent.change(inputs[i + 1]!, { target: { value: v } }))
    fireEvent.click(screen.getByText('Проверить'))
    expect(screen.getByText('выполнено')).toBeTruthy()
    fireEvent.change(inputs[1]!, { target: { value: 'xx' } })
    fireEvent.click(screen.getByText('Проверить'))
    const state = getState()
    expect(state.progress['1.04']).toMatchObject({ status: 'partial', firstTryCorrect: 5, firstTryTotal: 5 })
    expect(state.attempts.at(-1)!.attemptNo).toBe(2)
  })

  it('all correct but one empty: status partial; later fill counts as first try for that blank', () => {
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    ;['are', 'is', 'is', 'am'].forEach((v, i) => fireEvent.change(inputs[i + 1]!, { target: { value: v } }))
    fireEvent.click(screen.getByText('Проверить'))
    expect(screen.getByText('есть ошибки')).toBeTruthy()
    expect(inputs[5]!.className).toContain('empty')
    fireEvent.change(inputs[5]!, { target: { value: 'xx' } })
    fireEvent.click(screen.getByText('Проверить'))
    const state = getState()
    expect(state.progress['1.04']).toMatchObject({ status: 'partial', firstTryCorrect: 4, firstTryTotal: 5 })
    expect(state.attempts.filter((a) => a.first).length).toBe(5)
  })

  it('Enter does nothing: no check, focus stays', () => {
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    inputs[1]!.focus()
    fireEvent.change(inputs[1]!, { target: { value: 'are' } })
    fireEvent.keyDown(inputs[1]!, { key: 'Enter' })
    expect(document.activeElement).toBe(inputs[1]!)
    expect(inputs[1]!.className).not.toContain('ok')
    expect(localStorage.getItem('grammar-trainer:v1')).not.toContain('"attempts":[{')
  })

  it('check=false: no check buttons, only teacher export and done', () => {
    render(<Exercise block={ex(4)} book="Book" check={false} />)
    expect(screen.queryByText('Проверить')).toBeNull()
    expect(screen.queryByText('Показать ответы')).toBeNull()
    expect(screen.queryByLabelText('Проверить пункт 3')).toBeNull()
    expect(screen.getByText('Для преподавателя')).toBeTruthy()
    fireEvent.click(screen.getByText('Выполнено'))
    const state = getState()
    expect(state.progress['1.04']!.status).toBe('done')
  })

  it('checks a single item by its button', () => {
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    fireEvent.change(inputs[1]!, { target: { value: 'are' } })
    fireEvent.change(inputs[2]!, { target: { value: 'are' } })
    fireEvent.click(screen.getByLabelText('Проверить пункт 3'))
    expect(inputs[2]!.className).toContain('bad')
    expect(inputs[1]!.className).not.toContain('ok')
    const state = getState()
    expect(state.attempts.length).toBe(1)
    expect(state.progress['1.04']).toMatchObject({ status: 'partial', firstTryCorrect: 0, firstTryTotal: 1 })
  })
})

describe('Blank that stays empty by rule', () => {
  const block: ExerciseBlock = {
    kind: 'exercise', id: '9.99', number: 99, title: 'Test', charts: 'Chart 1-1', page: 1,
    parts: [{ type: 'fill', instruction: 'Add <i>a</i> or Ø.', items: [
      { n: 1, text: 'I have ___ car.', answers: [['a']] },
      { n: 2, text: 'I drink ___ water.', answers: [['']] },
    ] }],
  }
  it('empty field is "empty", Ø button is the deliberate answer', () => {
    render(<Exercise block={block} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    fireEvent.change(inputs[0]!, { target: { value: 'a' } })
    fireEvent.click(screen.getByText('Проверить'))
    expect(inputs[1]!.className).toContain('empty')
    expect(screen.getByText('есть ошибки')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Ничего, пункт 2'))
    expect(inputs[1]!.value).toBe('Ø')
    fireEvent.click(screen.getByText('Проверить'))
    expect(inputs[1]!.className).toContain('ok')
    expect(screen.getByText('выполнено')).toBeTruthy()
  })
  it('typed Ø in a blank that needs a word is wrong; answer hint shows Ø', () => {
    render(<Exercise block={block} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    fireEvent.change(inputs[0]!, { target: { value: 'Ø' } })
    fireEvent.change(inputs[1]!, { target: { value: 'the' } })
    fireEvent.click(screen.getByText('Проверить'))
    expect(inputs[0]!.className).toContain('bad')
    expect(inputs[1]!.className).toContain('bad')
    expect(screen.getAllByText('Ø').length).toBeGreaterThan(0)
  })
})

describe('Exercise 45 (choice)', () => {
  it('checks radio answers', () => {
    render(<Exercise block={ex(45)} book="Book" />)
    fireEvent.click(screen.getAllByLabelText('b. is')[0]!) // пункт 1 верно
    fireEvent.click(screen.getAllByLabelText('c. Ø')[1]!) // пункт 2 неверно
    // выбранный вариант встаёт в пропуск
    expect(screen.getByTestId(`slot-${ex(45).id}|0|1|0`).textContent).toBe('b. is')
    fireEvent.click(screen.getByText('Проверить'))
    const state = getState()
    expect(state.attempts.length).toBe(2) // невыбранные пункты пустые, не ошибки
    expect(state.attempts.filter((a) => a.correct).length).toBe(1)
  })
})

describe('Exercise 12 (set)', () => {
  it('accepts answers in any order and flags incomplete columns', () => {
    render(<Exercise block={ex(12)} book="Book" />)
    const inputs = screen.getAllByRole('textbox').filter((i) => !(i as HTMLInputElement).disabled) as HTMLInputElement[]
    // таблица строится по строкам: строка r содержит COUNTRY, LANGUAGE, CITY, ISLAND
    const col = (c: number, r: number) => inputs.filter((i) => i.closest('td')?.cellIndex === c)[r]!
    ;['Taiwan', 'Cuba', 'France', 'Mexico', 'Russia', 'Saudi Arabia'].forEach((v, r) => fireEvent.change(col(0, r), { target: { value: v } }))
    fireEvent.change(col(3, 0), { target: { value: 'Hawaii' } })
    fireEvent.click(screen.getByText('Проверить'))
    expect(col(0, 0).className).toContain('ok')
    expect(col(0, 5).className).toContain('ok')
    expect(col(3, 0).className).toContain('ok')
    expect(col(3, 1).className).toContain('empty') // колонка не завершена: пусто, не ошибка
    expect(screen.getByText('есть ошибки')).toBeTruthy()
  })
})

describe('Exercise 1 (info)', () => {
  it('has a Done button', () => {
    render(<Exercise block={ex(1)} book="Book" />)
    fireEvent.click(screen.getByText('Выполнено'))
    const state = getState()
    expect(state.progress['1.01']!.status).toBe('done')
  })
})

describe('Teacher review in the app', () => {
  it('shows strikethrough, fix and comment from a loaded review', async () => {
    const { setReview } = await import('../store')
    setReview({ exerciseId: '1.04', checkedAt: '2026-10-23T10:00:00Z', marks: { '1.04|0|3|0': { wrong: true, fix: 'is' } }, comment: 'Повторите тему', ink: null, inkW: 0, inkH: 0 })
    render(<Exercise block={ex(4)} book="Book" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    expect(inputs[2]!.className).toContain('rv-wrong')
    expect(inputs[1]!.className).not.toContain('rv-wrong')
    expect(screen.getByText('is', { selector: '.rv-fix' })).toBeTruthy()
    expect(screen.getByText('Повторите тему')).toBeTruthy()
    expect(screen.getByText('проверено')).toBeTruthy()
    expect(screen.getByText('Загрузить проверку')).toBeTruthy()
  })
})

describe('listening exercise', () => {
  it('shows the audio badge in the app and in the teacher file', () => {
    const block = mnn06.blocks.find((b) => b.kind === 'exercise' && b.label === '問題 1') as ExerciseBlock
    render(<Exercise block={block} book={mnn06.book} check={false} />)
    expect(screen.getByText('CD22')).toBeTruthy()
    expect(screen.getByText(/Прослушайте аудио/)).toBeTruthy()
    expect(screen.getAllByRole('textbox').length).toBe(5)
    expect(exerciseToHtml(block, {}, mnn06.book)).toContain('<b>CD22</b>')
  })
})
