// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isCorrect, normalize, checkSet } from './check'

describe('normalize', () => {
  it('trims, lowercases, unifies apostrophes, drops final period', () => {
    expect(normalize('  They’re   Happy. ')).toBe("they're happy")
  })
})

describe('isCorrect', () => {
  it('accepts any listed variant', () => {
    expect(isCorrect('He', ['he', 'she'])).toBe(true)
    expect(isCorrect('it', ['he', 'she'])).toBe(false)
  })
  it('treats contractions as equal when contractionsFree', () => {
    expect(isCorrect("Argentina isn't a city. It's a country.", ["Argentina isn't a city. It is a country."], true)).toBe(true)
    expect(isCorrect("Canada is a country. It's not a city.", ["Canada is a country. It isn't a city."], true)).toBe(true)
    expect(isCorrect('They are absent.', ["They're absent."], true)).toBe(true)
  })
  it('is strict without contractionsFree', () => {
    expect(isCorrect('He is', ["He's"])).toBe(false)
  })
})

describe('checkSet', () => {
  it('marks members, duplicates and completeness', () => {
    const r = checkSet(['Cuba', 'cuba', 'Paris', ''], [], ['Cuba', 'Hawaii'])
    expect(r.perBlank).toEqual([true, false, false, null])
    expect(r.complete).toBe(false)
    expect(checkSet(['Hawaii', 'Cuba'], [], ['Cuba', 'Hawaii']).complete).toBe(true)
  })
})

describe('nothing (Ø)', () => {
  it('matches an empty accepted answer only', () => {
    expect(isCorrect('Ø', [''])).toBe(true)
    expect(isCorrect(' - ', [''])).toBe(true)
    expect(isCorrect('ничего', ['', 'a'])).toBe(true)
    expect(isCorrect('Ø', ['a'])).toBe(false)
    expect(isCorrect('', [''])).toBe(true) // пустоту отсекает компонент, не проверка
    expect(isCorrect('a', [''])).toBe(false)
  })
})

describe('periods are optional', () => {
  it('ignores periods inside and at the end, and ? / ! at the end', () => {
    expect(isCorrect('Mr and Mrs Nelson are late', ['Mr. and Mrs. Nelson are late.'])).toBe(true)
    expect(isCorrect('Dr Sana Gupta', ['Dr. Sana Gupta'])).toBe(true)
    expect(isCorrect('Mr.Nelson is late', ['Mr. Nelson is late.'])).toBe(true)
    expect(isCorrect('Is he late', ['Is he late?'])).toBe(true)
    expect(normalize('Mr. Nelson.')).toBe('mr nelson')
  })
})
