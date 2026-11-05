// Журнал клиента и отчёты.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReport, clearLog, describeError, getLog, log } from './log'
import { isClientReportInput } from '../shared/api'

beforeEach(() => {
  clearLog()
  sessionStorage.clear()
})

describe('client log', () => {
  it('keeps a bounded ring buffer and persists the tail', () => {
    for (let i = 0; i < 350; i++) log('info', `e${String(i)}`)
    expect(getLog()).toHaveLength(300)
    expect(getLog()[0]?.msg).toBe('e50')
    const stored = JSON.parse(sessionStorage.getItem('grammar-trainer:log') ?? '[]') as unknown[]
    expect(stored).toHaveLength(100)
  })
  it('builds a report that the server accepts', () => {
    log('nav', '#/azar')
    log('action', 'check', { exercise: '1.04' })
    log('error', 'boom', describeError(new TypeError('bad')))
    const r = buildReport('не работает')
    expect(isClientReportInput(r)).toBe(true)
    expect(r.events.map((e) => e.kind)).toEqual(['nav', 'action', 'error'])
    expect(r.build).toBeTruthy()
    expect((r.events[2]?.data as { message: string }).message).toBe('TypeError: bad')
  })
  it('describeError trims stacks', () => {
    const d = describeError(new Error('x'))
    expect(d.message).toBe('Error: x')
    expect((d.stack ?? '').split('\n').length).toBeLessThanOrEqual(12)
    expect(describeError('plain')).toEqual({ message: 'plain' })
  })
  it('logs errors to console only in dev', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    log('error', 'x')
    expect(spy.mock.calls.length).toBe(0) // в тестах (MODE=test) консоль молчит
    spy.mockRestore()
  })
})
