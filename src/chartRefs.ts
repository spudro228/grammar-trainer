// Разбор строки "Charts 1-3 and 1-4" / "Charts 1-5 → 1-7" / "Chapter 1" в список id таблиц.
import type { Chapter } from './types'

export function chartIds(chapter: Chapter): string[] {
  return chapter.blocks.filter((b) => b.kind === 'chart').map((b) => b.id)
}

export function refsToCharts(refs: string, all: string[]): string[] {
  if (/^Chapter/i.test(refs)) return all
  const ids = refs.match(/\d+-\d+/g) ?? []
  const [first, second] = ids
  if (refs.includes('→') && first !== undefined && second !== undefined && ids.length === 2) {
    const a = all.indexOf(first)
    const b = all.indexOf(second)
    if (a >= 0 && b >= a) return all.slice(a, b + 1)
  }
  if (ids.length > 0) return ids.filter((x) => all.includes(x))
  // Иные учебники: id таблиц перечислены буквально ("文型, 練習A").
  return all.filter((id) => refs.includes(id))
}
