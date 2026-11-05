// Раздел «Онлайн» на главной: сервер, вход по токену, регистрация ученика, синхронизация, проверки.
import { useEffect, useState } from 'react'
import { roleLabel } from '../../shared/api'
import { api } from '../api'
import { login, probeServer, useOnline } from '../online'
import { pullReviews, pullState, pushState } from '../sync'
import { log } from '../log'

const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function OnlinePanel() {
  const { availability, user } = useOnline()
  const [name, setName] = useState('')
  const [token, setToken] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    void probeServer()
  }, [])

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(true)
    log('action', label)
    try {
      setNote(await fn())
    } catch (e) {
      log('error', `${label} failed`, { message: msgOf(e) })
      setNote(`${label}: ${msgOf(e)}`)
    } finally {
      setBusy(false)
    }
  }

  if (availability === 'unknown') {
    return (
      <section className="home-tools online">
        <h3>Онлайн</h3>
        <p className="muted">Проверяю сервер…</p>
      </section>
    )
  }
  if (availability === 'offline') {
    return (
      <section className="home-tools online">
        <h3>Онлайн</h3>
        <p className="muted">Сервер недоступен. Работает обмен файлами: «Для преподавателя» и «Загрузить проверку».</p>
        <div className="tools"><button onClick={() => void probeServer(true)}>Проверить снова</button></div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="home-tools online">
        <h3>Онлайн</h3>
        <div className="tools">
          <input value={token} placeholder="Токен" aria-label="Токен" onChange={(e) => setToken(e.target.value)} />
          <button
            className="primary"
            disabled={busy || !token.trim()}
            onClick={() => void run('Вход', async () => { const t = token.trim(); const u = await api.me(t); login({ ...u, token: t }); return `Здравствуйте, ${u.name}` })}
          >
            Войти по токену
          </button>
        </div>
        <div className="tools">
          <input value={name} placeholder="Имя" aria-label="Имя" onChange={(e) => setName(e.target.value)} />
          <button
            disabled={busy || !name.trim()}
            onClick={() => void run('Регистрация', async () => { const u = await api.register(name.trim()); login(u); setShowToken(true); return `Ваш код: ${u.id}. Сохраните токен: он нужен для входа на другом устройстве.` })}
          >
            Зарегистрироваться как ученик
          </button>
        </div>
        <p className="muted">Токен выдаёт преподаватель или администратор. Ученик может зарегистрироваться сам.</p>
        {note && <p className="shared-note">{note}</p>}
      </section>
    )
  }

  return (
    <section className="home-tools online">
      <h3>Онлайн</h3>
      <p>
        {roleLabel[user.role][0]?.toUpperCase()}{roleLabel[user.role].slice(1)}: <b>{user.name}</b>, код <code className="student-code">{user.id}</code>.
        {' '}
        <button className="link" onClick={() => setShowToken((s) => !s)}>{showToken ? 'Скрыть токен' : 'Показать токен'}</button>
        {showToken && (
          <>
            {' '}<code className="student-code token">{user.token}</code>{' '}
            <button className="link" onClick={() => void navigator.clipboard.writeText(user.token).then(() => setNote('Токен скопирован')).catch(() => setNote('Скопируйте токен вручную'))}>Копировать</button>
          </>
        )}
      </p>
      {user.role === 'student' && (
        <>
          <div className="tools">
            <button className="primary" disabled={busy} onClick={() => void run('Сохранение', async () => `Сохранено на сервере ${new Date(await pushState(user.id)).toLocaleString('ru-RU')}`)}>
              Сохранить на сервер
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm('Заменить прогресс в этом браузере копией с сервера?')) return
                void run('Загрузка', async () => `Загружена копия от ${new Date(await pullState(user.id)).toLocaleString('ru-RU')}`)
              }}
            >
              Загрузить с сервера
            </button>
            <button disabled={busy} onClick={() => void run('Проверки', async () => { const n = await pullReviews(user.id); return n ? `Новых проверок: ${String(n)}` : 'Новых проверок нет' })}>
              Получить проверки
            </button>
            <button className="ghost" disabled={busy} onClick={() => { login(null); setNote(null) }}>Выйти</button>
          </div>
          <p className="muted">В упражнениях есть кнопка «Отправить преподавателю». Сообщите код преподавателю. Проверки приходят по кнопке «Получить проверки».</p>
        </>
      )}
      {user.role !== 'student' && (
        <div className="tools">
          <a className="button" href="#/teacher">Кабинет преподавателя</a>
          {user.role === 'admin' && <a className="button" href="#/admin">Администрирование</a>}
          <button className="ghost" onClick={() => { login(null); setNote(null) }}>Выйти</button>
        </div>
      )}
      {note && <p className="shared-note">{note}</p>}
    </section>
  )
}
