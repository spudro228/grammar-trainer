import { useEffect, useRef, useState } from 'react'
import type { Book } from './books'
import type { Chapter, ExerciseBlock } from './types'
import { bookById, bookExercises } from './books'
import { Chart } from './components/Chart'
import { Html } from './components/Html'
import { Exercise, exerciseName, isSendable } from './components/Exercise'
import { SendBar } from './components/SendBar'
import { Home } from './components/Home'
import { Progress } from './components/Progress'
import { Review } from './components/Review'
import { Teacher } from './components/Teacher'
import { Admin } from './components/Admin'
import { LoginLink } from './components/LoginLink'
import { useStore } from './store'
import { log } from './log'

type View = 'chapter' | 'progress' | 'review'

/**
 * Маршрут из адреса: #/ — главная, #/teacher — кабинет преподавателя, #/admin — администрирование, #/login/<токен> — вход по ссылке,
 * #/<book> — учебник (первая глава), #/<book>/<номер главы>, затем /progress или /review. Без номера — первая глава.
 */
function parseHash(hash: string): { bookId: string | null; chapterNo: number | null; view: View; teacher: boolean; admin: boolean; loginToken: string | null } {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const chapterNo = /^\d+$/.test(parts[1] ?? '') ? Number(parts[1]) : null
  const v = parts[chapterNo === null ? 1 : 2]
  const view: View = v === 'progress' || v === 'review' ? v : 'chapter'
  return { bookId: parts[0] ?? null, chapterNo, view, teacher: parts[0] === 'teacher', admin: parts[0] === 'admin', loginToken: parts[0] === 'login' ? (parts[1] ?? null) : null }
}

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => {
      log('nav', window.location.hash.replace(/(#\/login\/)[^/]+/, '$1***') || '#/')
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export const navigate = (path: string) => {
  window.location.hash = path
}

export function App() {
  const { bookId, chapterNo, view, teacher, admin, loginToken } = parseHash(useHash())
  if (loginToken) return <LoginLink token={loginToken} />
  if (teacher) return <Teacher />
  if (admin) return <Admin />
  const book = bookId ? bookById(bookId) : undefined
  const chapter = book?.chapters.find((c) => c.number === chapterNo) ?? book?.chapters[0]
  if (!book || !chapter) return <Home onOpen={(id) => navigate(`/${id}`)} />
  return <BookView key={chapter.number} book={book} chapter={chapter} view={view} />
}

function BookView({ book, chapter, view }: { book: Book; chapter: Chapter; view: View }) {
  const store = useStore()
  const pendingScroll = useRef<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const sendable = chapter.blocks.filter((b): b is ExerciseBlock => b.kind === 'exercise' && isSendable(b))
  const select = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const clearSelected = (ids?: string[]) => setSelected((prev) => (ids ? new Set([...prev].filter((id) => !ids.includes(id))) : new Set()))

  const exercises = bookExercises(book)
  const done = exercises.filter((e) => store.progress[e.id]?.status === 'done').length
  const multi = book.chapters.length > 1
  const pathOf = (c: Chapter, v: View) => `/${book.id}${multi ? `/${c.number}` : ''}${v === 'chapter' ? '' : '/' + v}`
  const go = (v: View) => navigate(pathOf(chapter, v))

  function openExercise(id: string) {
    pendingScroll.current = `ex-${id}`
    go('chapter')
  }
  useEffect(() => {
    if (view === 'chapter' && pendingScroll.current) {
      document.getElementById(pendingScroll.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      pendingScroll.current = null
    }
  }, [view])

  return (
    <div className="app">
      <header className="topbar">
        <a className="home-link" href="#/" title="На главную">← Главная</a>
        <div className="brand">{book.title}</div>
        <nav>
          {book.chapters.length > 6 ? (
            <select
              className={`chapter-select ${view === 'chapter' ? 'active' : ''}`}
              aria-label="Урок"
              value={chapter.number}
              onChange={(e) => {
                const c = book.chapters.find((x) => x.number === Number(e.target.value))
                if (c) { navigate(pathOf(c, 'chapter')); if (c !== chapter) window.scrollTo(0, 0) }
              }}
            >
              {book.chapters.map((c) => <option key={c.number} value={c.number}>{chapterHeading(c)}</option>)}
            </select>
          ) : (
            book.chapters.map((c) => (
              <button key={c.number} className={view === 'chapter' && c === chapter ? 'active' : ''} onClick={() => { navigate(pathOf(c, 'chapter')); if (c !== chapter) window.scrollTo(0, 0) }}>Глава {c.number}</button>
            ))
          )}
          <button className={view === 'progress' ? 'active' : ''} onClick={() => go('progress')}>Прогресс</button>
          {chapter.check !== false && <button className={view === 'review' ? 'active' : ''} onClick={() => go('review')}>Повторить ошибки</button>}
        </nav>
        <div className="progressbar" title={`${done} / ${exercises.length}`}>
          <div style={{ width: `${(100 * done) / exercises.length}%` }} />
        </div>
      </header>

      <div className={`layout lang-${chapter.lang ?? 'en'}`} lang={chapter.lang ?? 'en'}>
        <aside className="sidebar">
          <div className="side-title">{chapterHeading(chapter)}{chapter.title ? `: ${chapter.title}` : ''}</div>
          <ul>
            {chapter.blocks.map((b) =>
              b.kind === 'chart' ? (
                <li key={b.id} className="side-chart">
                  <a href={`#chart-${b.id}`} onClick={(e) => { e.preventDefault(); pendingScroll.current = `chart-${b.id}`; go('chapter'); scrollNow(`chart-${b.id}`, view) }}>
                    <b>{b.id}</b> <span dangerouslySetInnerHTML={{ __html: b.title }} />
                  </a>
                </li>
              ) : (
                <li key={b.id} className={`side-ex status-${store.progress[b.id]?.status ?? 'new'}`}>
                  <a href={`#ex-${b.id}`} onClick={(e) => { e.preventDefault(); openExercise(b.id); scrollNow(`ex-${b.id}`, view) }}>
                    <span className="dot" /> <Html html={exerciseName(b, true)} />
                  </a>
                </li>
              ),
            )}
          </ul>
        </aside>

        <main className="content">
          {view === 'chapter' && (
            <>
              <div className="chapter-banner">
                <div className="chapter-num">{chapterHeading(chapter)}</div>
                {chapter.title && <div className="chapter-title">{chapter.title}</div>}
              </div>
              {chapter.blocks.map((b) =>
                b.kind === 'chart' ? (
                  <Chart key={b.id} block={b} />
                ) : (
                  <Exercise key={b.id} block={b} book={chapter.book} check={chapter.check !== false} selected={selected.has(b.id)} onSelect={(on) => select(b.id, on)} />
                ),
              )}
              <SendBar
                blocks={sendable.filter((b) => selected.has(b.id))}
                total={sendable.length}
                book={chapter.book}
                onSelectAll={() => setSelected(new Set(sendable.map((b) => b.id)))}
                onClear={clearSelected}
              />
            </>
          )}
          {view === 'progress' && <Progress chapter={chapter} onOpen={openExercise} />}
          {view === 'review' && <Review chapter={chapter} />}
        </main>
      </div>
    </div>
  )
}

export const chapterHeading = (c: Chapter) => c.heading ?? `Chapter ${c.number}`

function scrollNow(id: string, view: View) {
  if (view === 'chapter') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
