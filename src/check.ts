// Нормализация и сравнение ответов. См. docs/MVP.md, раздел 5.

export function normalize(s: string, ja = false): string {
  if (ja) return normalizeJa(s)
  return s
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\./g, ' ') // точки не учитываются: "Mr. Nelson." = "Mr Nelson"
    .replace(/\s*([,!?])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[!?]$/, '')
    .trim()
}

/** Приводит сокращённые и полные формы be к одному виду. Только для rewrite с contractionsFree. */
export function unifyContractions(s: string): string {
  return s
    .replace(/\b(he|she|it)'s not\b/g, "$1 isn't")
    .replace(/\b(we|you|they)'re not\b/g, "$1 aren't")
    .replace(/\bis not\b/g, "isn't")
    .replace(/\bare not\b/g, "aren't")
    .replace(/\b(he|she|it) is\b/g, "$1's")
    .replace(/\b(we|you|they) are\b/g, "$1're")
    .replace(/\bi am\b/g, "i'm")
}

/** Японский: полная ширина → обычная, без пробелов, без 。、, без многоточия в начале. */
export function normalizeJa(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/^[.…・]+/, '')
    .replace(/[\s　]+/g, '')
    .replace(/[。、.,]/g, '')
    .replace(/[~〜]/g, '～')
    .toLowerCase()
}

/** Явный ответ «ничего»: пропуск оставлен пустым по правилу. В контенте такой ответ записан как ''. */
export const NOTHING = 'Ø'
export function isNothing(s: string): boolean {
  return /^(ø|—|–|-|×|x|nothing|ничего)$/i.test(s.trim())
}

export function isCorrect(answer: string, accepted: string[], contractionsFree = false, ja = false): boolean {
  const norm = (x: string) => (contractionsFree ? unifyContractions(normalize(x)) : normalize(x, ja))
  const n = (x: string) => (isNothing(x) ? '' : norm(x))
  const a = n(answer)
  return accepted.some((x) => n(x) === a)
}

/**
 * Проверка колонки типа set. values — введённые значения (без prefilled).
 * Возвращает по полю: true/false, или null для пустого поля; и complete — все ответы покрыты.
 */
export function checkSet(values: string[], prefilled: string[], accepted: string[]): { perBlank: (boolean | null)[]; complete: boolean } {
  const want = new Set(accepted.map((a) => normalize(a)))
  const seen = new Set(prefilled.map((a) => normalize(a)))
  const perBlank = values.map((v) => {
    if (normalize(v) === '') return null
    const n = normalize(v)
    if (want.has(n) && !seen.has(n)) {
      seen.add(n)
      return true
    }
    return false
  })
  const complete = [...want].every((w) => seen.has(w))
  return { perBlank, complete }
}
