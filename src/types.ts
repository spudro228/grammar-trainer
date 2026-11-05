// Типы контента и хранилища. См. docs/MVP.md.

export type ExerciseType = 'fill' | 'choice' | 'rewrite' | 'set' | 'info'

export interface ChartBlock {
  kind: 'chart'
  id: string // "1-1"
  title: string
  html: string // тело таблицы (строки <tr>), шапка рисуется компонентом
  note?: string // сноска под таблицей (HTML)
  image?: string
}

export interface Item {
  n: number
  /** Текст пункта. `___` = пропуск. Для choice пропуск тоже `___`. */
  text: string
  /** answers[i] — допустимые варианты для пропуска i. Пустой массив = свободный ответ, не проверяется. */
  answers: string[][]
  /** Пример из книги: показан заполненным, заблокирован, не идёт в статистику. */
  example?: boolean
  /** Для choice: варианты. Один пропуск на пункт. */
  options?: string[]
  /** Для set: число полей в колонке и заранее заполненные значения. */
  blanks?: number
  prefilled?: string[]
  /** Подпись колонки для set. */
  label?: string
}

export interface Part {
  label?: string // "Part I."
  type: ExerciseType
  instruction: string // HTML
  /** Текст-вставка (абзац для чтения, диалог) — HTML. */
  text?: string
  /** Слова из рамки. */
  box?: string[]
  /** Задание на аудирование: номер трека (CD22). Над инструкцией значок и просьба прослушать аудио. */
  audio?: string
  image?: string
  imageCaption?: string
  /** Для rewrite: считать сокращённые и полные формы be равными. */
  contractionsFree?: boolean
  /** Подсказка-шапка над полями (например "FULL FORM | CONTRACTION"). */
  columns?: string[]
  /** Японский текст: при сравнении убираются все пробелы и знаки 。、. */
  ja?: boolean
  /** Подпись кнопки «ничего» (по умолчанию Ø; в японских учебниках ×). */
  nothing?: string
  items: Item[]
}

export interface ExerciseBlock {
  kind: 'exercise'
  id: string // "1.03"
  number: number
  /** Подпись вместо "Exercise N" (например "練習B 1"). */
  label?: string
  title: string // "Looking at grammar"
  charts: string // "Chart 1-1" / "Charts 1-3 and 1-4" / "文型, 練習A"
  page: number // страница книги
  parts: Part[]
}

export type Block = ChartBlock | ExerciseBlock

export interface Chapter {
  /** Название учебника для выгрузки преподавателю. */
  book: string
  /** Язык контента. */
  lang?: 'en' | 'ja'
  /** Заголовок баннера, по умолчанию "Chapter N". */
  heading?: string
  /** false — автопроверки нет, задания только отправляются преподавателю. */
  check?: boolean
  number: number
  title: string
  blocks: Block[]
}

// ---------- хранилище ----------

export interface Attempt {
  /** Первая попытка для этого пропуска: идёт в статистику темы. */
  first?: boolean
  ts: number
  exerciseId: string
  partIndex: number
  itemN: number
  blank: number
  answer: string
  correct: boolean
  attemptNo: number
}

export type Status = 'new' | 'partial' | 'done'

export interface ExerciseProgress {
  status: Status
  firstTryCorrect: number
  firstTryTotal: number
  lastTs: number
}

/** Ключ поля: `${exerciseId}|${partIndex}|${itemN}|${blank}` */
export type Drafts = Record<string, string>

export type { Review, ReviewMark } from '../shared/api'
