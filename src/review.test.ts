import { describe, it, expect } from 'vitest'
import { exerciseToHtml, exercisesToHtml, exportBatchFileName } from './export'
import { parseReviewFile, parseReviewFiles } from './review'
import { ch01 } from './content/ch01'
import { mnn05 } from './content/mnn05'
import { mnn06 } from './content/mnn06'
import type { ExerciseBlock } from './types'

const ex4 = ch01.blocks.find((b) => b.kind === 'exercise' && b.number === 4) as ExerciseBlock

/** Запускает встроенный набор проверки в отдельном документе jsdom и возвращает его window. */
function openInTeacherBrowser(html: string) {
  const doc = document.implementation.createHTMLDocument('')
  doc.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '')
  // скрипты, вставленные через innerHTML, не выполняются — запускаем вручную
  const scripts = Array.from(doc.querySelectorAll('script:not([type])'))
  const saved: string[] = []
  const g = globalThis as unknown as { URL: { createObjectURL: ((b: Blob) => string) | undefined; revokeObjectURL: ((u: string) => void) | undefined } }
  const origCreate = g.URL.createObjectURL
  const origRevoke = g.URL.revokeObjectURL
  g.URL.createObjectURL = (b: Blob) => {
    void b.text().then((t) => saved.push(t))
    return 'blob:test'
  }
  g.URL.revokeObjectURL = () => {}
  HTMLAnchorElement.prototype.click = function () {} // не переходить по blob:
  const run = () => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- скрипт набора проверки запускается как в браузере
    for (const sc of scripts) new Function('document', 'window', sc.textContent ?? '')(doc, window)
  }
  return { doc, run, saved, restore: () => { g.URL.createObjectURL = origCreate; g.URL.revokeObjectURL = origRevoke } }
}

describe('teacher review file', () => {
  it('unchecked export is rejected; checked file round-trips marks and comment', async () => {
    const html = exerciseToHtml(ex4, { '1.04|0|2|0': 'are', '1.04|0|3|0': 'are' }, 'Book')
    expect(() => parseReviewFile(html)).toThrow(/не проверен/)

    const t = openInTeacherBrowser(html)
    t.run()
    expect(t.doc.getElementById('rk-bar')).toBeTruthy()
    const wrong = t.doc.querySelector<HTMLElement>('[data-key="1.04|0|3|0"]')!
    wrong.click()
    expect(wrong.classList.contains('rk-wrong')).toBe(true)
    ;(wrong.nextElementSibling as HTMLElement).textContent = 'is'
    ;(t.doc.getElementById('rk-comment') as HTMLTextAreaElement).value = 'Повторите chart 1-1'
    ;(t.doc.getElementById('rk-save') as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 20))
    t.restore()
    expect(t.saved.length).toBe(1)
    const checked = t.saved[0]!
    expect(checked).not.toContain('<div id="rk-bar"') // служебные элементы не сохраняются
    const review = parseReviewFile(checked)
    expect(review.exerciseId).toBe('1.04')
    expect(review.marks['1.04|0|3|0']).toEqual({ wrong: true, fix: 'is' })
    expect(review.marks['1.04|0|2|0']).toBeUndefined()
    expect(review.comment).toBe('Повторите chart 1-1')
    expect(review.ink).toBeNull()

    // проверенный файл открывается снова с теми же отметками
    const t2 = openInTeacherBrowser(checked)
    t2.run()
    t2.restore()
    expect(t2.doc.querySelector<HTMLElement>('[data-key="1.04|0|3|0"]')!.classList.contains('rk-wrong')).toBe(true)
    expect(t2.doc.getElementById('rk-status')?.textContent).toContain('Проверено')
  })

  it('rejects foreign files', () => {
    expect(() => parseReviewFile('<html><body>hi</body></html>')).toThrow(/не файл проверки/)
  })

  it('kit runs on every exercise of both books: fill, choice, rewrite, set, info', async () => {
    for (const ch of [ch01, mnn05, mnn06]) {
      for (const b of ch.blocks.filter((x): x is ExerciseBlock => x.kind === 'exercise')) {
        const drafts: Record<string, string> = {}
        b.parts.forEach((p, pi) => p.items.forEach((it) => { if (!it.example) drafts[`${b.id}|${pi}|${it.n}|0`] = p.type === 'choice' ? (it.options?.[0] ?? '') : 'xx' }))
        const html = exerciseToHtml(b, drafts, ch.book)
        const t = openInTeacherBrowser(html)
        expect(() => t.run(), b.id).not.toThrow()
        expect(t.doc.getElementById('rk-bar'), b.id).toBeTruthy()
        expect(t.doc.getElementById('rk-comment'), b.id).toBeTruthy()
        const keyed = Array.from(t.doc.querySelectorAll<HTMLElement>('[data-key]'))
        const expected = Object.keys(drafts).length
        expect(keyed.length, `${b.id}: data-key count`).toBeGreaterThanOrEqual(expected)
        if (keyed.length) {
          keyed[0]!.click()
          expect(keyed[0]!.classList.contains('rk-wrong') || keyed[0]!.classList.contains('rk-sel'), b.id).toBe(true)
          ;(keyed[0]!.nextElementSibling as HTMLElement).textContent = 'fix'
        }
        ;(t.doc.getElementById('rk-comment') as HTMLTextAreaElement).value = 'ok'
        ;(t.doc.getElementById('rk-save') as HTMLButtonElement).click()
        await new Promise((r) => setTimeout(r, 5))
        t.restore()
        expect(t.saved.length, b.id).toBe(1)
        const review = parseReviewFile(t.saved[0]!)
        expect(review.exerciseId).toBe(b.id)
        expect(review.comment).toBe('ok')
        if (keyed.length) expect(review.marks[keyed[0]!.getAttribute('data-key')!]?.fix).toBe('fix')
      }
    }
  })

  it('several exercises in one file: one kit, review splits back per exercise', async () => {
    const blocks = mnn06.blocks.filter((x): x is ExerciseBlock => x.kind === 'exercise' && ['mnn6.01', 'mnn6.15'].includes(x.id))
    expect(blocks).toHaveLength(2)
    const [a, b] = blocks as [ExerciseBlock, ExerciseBlock]
    const drafts: Record<string, string> = {}
    for (const blk of blocks) blk.parts.forEach((p, pi) => p.items.forEach((it) => { if (!it.example) drafts[`${blk.id}|${pi}|${it.n}|0`] = p.type === 'choice' ? (it.options?.[0] ?? '') : 'xx' }))
    const html = exercisesToHtml(blocks, drafts, mnn06.book)
    expect(html.match(/id="rk-bar"|<script id="review"/g)).toHaveLength(1)
    expect(html).toContain(`id="ex-${a.id}"`)
    expect(html).toContain(`id="ex-${b.id}"`)
    expect(exportBatchFileName(blocks, new Date(2026, 9, 29, 14, 5))).toBe('exercises-mnn6.01--mnn6.15_2026-10-29_1405')

    const t = openInTeacherBrowser(html)
    t.run()
    expect(t.doc.querySelectorAll('#rk-bar')).toHaveLength(1)
    const keyA = t.doc.querySelector<HTMLElement>(`[data-key^="${a.id}|"]`)!
    const keyB = t.doc.querySelector<HTMLElement>(`[data-key^="${b.id}|"]`)!
    keyA.click()
    ;(keyA.nextElementSibling as HTMLElement).textContent = 'fixA'
    keyB.click()
    ;(keyB.nextElementSibling as HTMLElement).textContent = 'fixB'
    ;(t.doc.getElementById('rk-comment') as HTMLTextAreaElement).value = 'общий'
    ;(t.doc.getElementById('rk-save') as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 5))
    t.restore()
    expect(t.saved).toHaveLength(1)

    const reviews = parseReviewFiles(t.saved[0]!)
    expect(reviews.map((r) => r.exerciseId)).toEqual([a.id, b.id])
    expect(Object.keys(reviews[0]!.marks)).toEqual([keyA.getAttribute('data-key')])
    expect(Object.keys(reviews[1]!.marks)).toEqual([keyB.getAttribute('data-key')])
    expect(reviews[1]!.marks[keyB.getAttribute('data-key')!]?.fix).toBe('fixB')
    expect(reviews.every((r) => r.comment === 'общий')).toBe(true)
    // одно задание — обычный файл, как у кнопки в задании
    expect(exercisesToHtml([a], drafts, mnn06.book)).not.toContain('exerciseIds')
  })
})
