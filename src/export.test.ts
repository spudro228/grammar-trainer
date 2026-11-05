// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { exerciseToText, exerciseToHtml, stripHtml, exportFileName } from './export'
import { ch01 } from './content/ch01'
import { draftKey } from './store'
import type { ExerciseBlock } from './types'

const ex = (n: number) => ch01.blocks.find((b) => b.kind === 'exercise' && b.number === n) as ExerciseBlock

describe('export for teacher', () => {
  it('strips html', () => {
    expect(stripHtml('Choose <b>the</b> word.<br>Next &amp; last')).toBe('Choose the word.\nNext & last')
    expect(stripHtml('<p>Text</p><p class="muted">Ответы по ключу: x</p>')).toBe('Text')
  })
  it('renders fill answers in brackets, empty blanks as [____]', () => {
    const b = ex(4)
    const drafts = { [draftKey(b.id, 0, 2, 0)]: 'are' }
    const text = exerciseToText(b, drafts, 'Book')
    expect(text).toContain(`Book, стр. ${b.page}`)
    expect(text).toContain('Exercise 4.')
    expect(text).toContain('【are】')
    expect(text).toContain('［＿＿＿］')
    expect(text).toContain('(пример)')
  })
  it('renders choice and set', () => {
    const c = ex(45)
    const t1 = exerciseToText(c, { [draftKey(c.id, 0, 1, 0)]: 'b. is' }, 'Book')
    expect(t1).toContain('The test 【b. is】 easy.')
    expect(t1).toContain('［не выбрано］')
    const s = ex(12)
    const t2 = exerciseToText(s, { [draftKey(s.id, 0, 1, 0)]: 'Cuba' }, 'Book')
    expect(t2).toContain('COUNTRY: Cuba')
    expect(t2).toContain('LANGUAGE: Arabic')
  })
  it('renders html with highlighted answers and empty blanks', () => {
    const b = ex(4)
    const html = exerciseToHtml(b, { [draftKey(b.id, 0, 2, 0)]: 'are' }, 'Book')
    expect(html).toContain('<mark data-key="1.04|0|2|0">are</mark>')
    expect(html).toContain('id="review"')
    expect(html).toContain('class="empty"')
    expect(html).toContain('<title>Exercise 4. Looking at grammar</title>')
    expect(html).not.toContain('class="muted"')
  })
  it('file name carries date and time', () => {
    expect(exportFileName(ex(4), new Date(2026, 9, 23, 9, 5))).toBe('exercise-1.04_2026-10-23_0905')
  })
})
