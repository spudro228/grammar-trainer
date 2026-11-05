// Кабинет преподавателя: список присланных работ, открытие файла с набором проверки.
import { useCallback, useEffect, useState } from 'react'
import type { SubmissionMeta } from '../../shared/api'
import { api } from '../api'
import { probeServer, useOnline } from '../online'

export function Teacher() {
  const { availability, user } = useOnline()
  const [items, setItems] = useState<SubmissionMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const allowed = user?.role === 'teacher' || user?.role === 'admin'

  const load = useCallback(async () => {
    setError(null)
    if ((await probeServer(true)) !== 'online' || !allowed) {
      setItems(null)
      return
    }
    try {
      setItems(await api.allSubmissions())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [allowed])
  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="home teacher">
      <header className="home-head">
        <a className="home-link" href="#/">← Главная</a>
        <h1>Кабинет преподавателя</h1>
        <p className="muted">Откройте работу: в новой вкладке появится страница с набором проверки. Кнопка «Сохранить проверку» отправит результат ученику.</p>
      </header>
      {availability === 'offline' && <p className="muted">Сервер недоступен. Работы приходят только при запущенном сервере (см. README, «С сервером и базой»).</p>}
      {availability === 'online' && !allowed && <p className="shared-note">Нужен вход по токену преподавателя или администратора: раздел «Онлайн» на главной.</p>}
      {error && <p className="shared-note">{error}</p>}
      <div className="tools"><button onClick={() => void load()}>Обновить</button></div>
      <SubmissionTable items={items} />
    </div>
  )
}

export function SubmissionTable({ items }: { items: SubmissionMeta[] | null }) {
  if (!items) return null
  if (items.length === 0) return <p className="muted">Работ пока нет.</p>
  return (
    <table className="submissions">
      <thead>
        <tr><th>Дата</th><th>Ученик</th><th>Учебник</th><th>Упражнение</th><th>Проверка</th><th></th></tr>
      </thead>
      <tbody>
        {items.map((s) => (
          <tr key={s.id} className={s.reviewedAt ? 'reviewed' : ''}>
            <td>{new Date(s.createdAt).toLocaleString('ru-RU')}</td>
            <td>{s.studentName} <code className="student-code">{s.studentId}</code></td>
            <td>{s.book}</td>
            <td>{s.exerciseId}</td>
            <td>{s.reviewedAt ? `проверено ${new Date(s.reviewedAt).toLocaleString('ru-RU')}${s.reviewerName ? `, ${s.reviewerName}` : ''}` : 'ждёт'}</td>
            <td><a href={api.fileUrl(s.id)} target="_blank" rel="noreferrer">Открыть</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
