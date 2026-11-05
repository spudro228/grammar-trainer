import { useRef } from 'react'
import { books, bookExercises } from '../books'
import { useStore, exportJson, importJson, resetAll } from '../store'
import { OnlinePanel } from './OnlinePanel'
import { ReportButton } from './ReportButton'
import { describeError, log } from '../log'

export function Home({ onOpen }: { onOpen: (bookId: string) => void }) {
  const store = useStore()
  const fileInput = useRef<HTMLInputElement>(null)

  function doExport() {
    log('action', 'export')
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `grammar-trainer-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  async function doImport(file: File | undefined) {
    if (!file) return
    try {
      importJson(await file.text())
      log('action', 'import')
    } catch (e) {
      log('error', 'import failed', describeError(e))
      alert(`Импорт не удался: ${(e as Error).message}`)
    }
  }

  return (
    <div className="home">
      <header className="home-head">
        <h1>Тренажёр по учебникам</h1>
        <p className="muted">Выберите учебник. Прогресс и история ответов хранятся в этом браузере.</p>
      </header>
      <div className="book-grid">
        {books.map((book) => {
          const exercises = bookExercises(book)
          const done = exercises.filter((e) => store.progress[e.id]?.status === 'done').length
          const available = book.chapters.length > 0
          return (
            <article key={book.id} className={`book-card ${available ? '' : 'disabled'}`}>
              <div className="book-lang">{book.lang}</div>
              <h2>{book.title}</h2>
              <div className="book-author">{book.author}</div>
              <p>{book.note}</p>
              {available ? (
                <>
                  <div className="book-stats">
                    Глав: {book.chapters.length}. Выполнено упражнений: {done} / {exercises.length}
                  </div>
                  <div className="progressbar">
                    <div style={{ width: `${exercises.length ? (100 * done) / exercises.length : 0}%` }} />
                  </div>
                  <button className="primary" onClick={() => onOpen(book.id)}>Открыть</button>
                </>
              ) : (
                <button disabled>Скоро</button>
              )}
            </article>
          )
        })}
      </div>
      <section className="home-tools">
        <h3>Данные</h3>
        <div className="tools">
          <button onClick={doExport}>Экспорт</button>
          <button onClick={() => fileInput.current?.click()}>Импорт</button>
          <input ref={fileInput} type="file" accept="application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
          <button className="ghost" onClick={() => { if (confirm('Удалить всю историю и прогресс?')) { log('action', 'reset all'); resetAll() } }}>Очистить</button>
          <ReportButton />
        </div>
        <p className="muted">Экспорт сохраняет историю и прогресс по всем учебникам в один файл JSON.</p>
      </section>
      <OnlinePanel />
    </div>
  )
}
