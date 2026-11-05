import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { App } from '../App'
import { resetAll } from '../store'

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetAll()
  window.location.hash = ''
})

describe('Home page and routing', () => {
  it('lists books, opens a book by hash, returns home', async () => {
    render(<App />)
    expect(screen.getByText('Тренажёр по учебникам')).toBeTruthy()
    expect(screen.getByText('Basic English Grammar, 4e')).toBeTruthy()
    expect(screen.getByText('みんなの日本語 初級 I, 第2版')).toBeTruthy()
    expect(screen.getByText(/Выполнено упражнений: 0 \/ 46/)).toBeTruthy()
    fireEvent.click(screen.getAllByText('Открыть')[0]!)
    expect(window.location.hash).toBe('#/azar')
    expect(await screen.findByText('Глава 1')).toBeTruthy()
    expect(screen.getByText('← Главная').getAttribute('href')).toBe('#/')
    window.location.hash = '#/azar/progress'
    expect(await screen.findByText('Ошибок нет.')).toBeTruthy()
    window.location.hash = '#/minna'
    expect((await screen.findAllByText('第1課')).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Урок'), { target: { value: '6' } })
    expect(window.location.hash).toBe('#/minna/6')
    expect((await screen.findAllByText('第6課')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Прогресс'))
    expect(window.location.hash).toBe('#/minna/6/progress')
    expect(await screen.findByText('Прогресс. 第6課')).toBeTruthy()
    window.location.hash = '#/minna/progress'
    expect(await screen.findByText('Прогресс. 第1課')).toBeTruthy()
    window.location.hash = '#/'
    expect(await screen.findByText('Тренажёр по учебникам')).toBeTruthy()
  })
})
