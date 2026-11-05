// Реестр учебников. Один учебник = несколько глав. Идентификаторы упражнений уникальны во всём приложении.
import type { Chapter, ExerciseBlock } from './types'
import { ch01 } from './content/ch01'
import { mnn01 } from './content/mnn01'
import { mnn02 } from './content/mnn02'
import { mnn03 } from './content/mnn03'
import { mnn04 } from './content/mnn04'
import { mnn05 } from './content/mnn05'
import { mnn06 } from './content/mnn06'
import { mnn07 } from './content/mnn07'
import { mnn08 } from './content/mnn08'
import { mnn09 } from './content/mnn09'
import { mnn10 } from './content/mnn10'
import { mnn11 } from './content/mnn11'
import { mnn12 } from './content/mnn12'
import { mnn13 } from './content/mnn13'
import { mnn14 } from './content/mnn14'
import { mnn15 } from './content/mnn15'
import { mnn16 } from './content/mnn16'
import { mnn17 } from './content/mnn17'
import { mnn18 } from './content/mnn18'
import { mnn19 } from './content/mnn19'
import { mnn20 } from './content/mnn20'
import { mnn21 } from './content/mnn21'
import { mnn22 } from './content/mnn22'
import { mnn23 } from './content/mnn23'
import { mnn24 } from './content/mnn24'
import { mnn25 } from './content/mnn25'

export interface Book {
  id: string
  title: string
  author: string
  /** Язык учебника, подпись на карточке. */
  lang: string
  /** Короткое описание для карточки. */
  note: string
  chapters: Chapter[]
}

export const books: Book[] = [
  {
    id: 'azar',
    title: 'Basic English Grammar, 4e',
    author: 'Betty S. Azar, Stacy A. Hagen',
    lang: 'English',
    note: 'Грамматика английского. Ответы по ключу из книги.',
    chapters: [ch01],
  },
  {
    id: 'minna',
    title: 'みんなの日本語 初級 I, 第2版',
    author: 'スリーエーネットワーク',
    lang: '日本語',
    note: 'Уроки 1–25. Задания рабочей тетради с ключом. Задания 本冊 проверяет преподаватель.',
    chapters: [mnn01, mnn02, mnn03, mnn04, mnn05, mnn06, mnn07, mnn08, mnn09, mnn10, mnn11, mnn12, mnn13, mnn14, mnn15, mnn16, mnn17, mnn18, mnn19, mnn20, mnn21, mnn22, mnn23, mnn24, mnn25],
  },
]

export const bookById = (id: string) => books.find((b) => b.id === id)

export function bookExercises(book: Book): ExerciseBlock[] {
  return book.chapters.flatMap((c) => c.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise'))
}
