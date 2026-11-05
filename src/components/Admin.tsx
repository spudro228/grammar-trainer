// Администрирование: пользователи и токены, кабинеты учеников и преподавателей.
import { useCallback, useEffect, useState } from 'react'
import { roleLabel, type ClientReport, type Role, type SubmissionMeta, type User, type UserAuth } from '../../shared/api'
import { api } from '../api'
import { probeServer, useOnline } from '../online'
import type { State } from '../store'
import { SubmissionTable } from './Teacher'
import { loginLink } from './LoginLink'

const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function Admin() {
  const { availability, user } = useOnline()
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<UserAuth | null>(null)
  const [role, setRole] = useState<Role>('teacher')
  const [name, setName] = useState('')
  const [open, setOpen] = useState<User | null>(null)
  const isAdmin = user?.role === 'admin'

  const load = useCallback(async () => {
    setError(null)
    if ((await probeServer(true)) !== 'online' || !isAdmin) {
      setUsers(null)
      return
    }
    try {
      setUsers(await api.users())
    } catch (e) {
      setError(msgOf(e))
    }
  }, [isAdmin])
  useEffect(() => {
    void load()
  }, [load])

  async function act(fn: () => Promise<void>) {
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(msgOf(e))
    }
  }

  return (
    <div className="home teacher admin">
      <header className="home-head">
        <a className="home-link" href="#/">← Главная</a>
        <h1>Администрирование</h1>
        <p className="muted">Пользователи, токены, кабинеты. Токен показывается один раз: при создании и при смене.</p>
      </header>
      {availability === 'offline' && <p className="muted">Сервер недоступен.</p>}
      {availability === 'online' && !isAdmin && <p className="shared-note">Нужен вход по токену администратора: раздел «Онлайн» на главной.</p>}
      {error && <p className="shared-note">{error}</p>}
      {isAdmin && (
        <div className="tools">
          <select value={role} aria-label="Роль" onChange={(e) => setRole(e.target.value === 'student' ? 'student' : 'teacher')}>
            <option value="teacher">преподаватель</option>
            <option value="student">ученик</option>
          </select>
          <input value={name} placeholder="Имя" aria-label="Имя нового пользователя" onChange={(e) => setName(e.target.value)} />
          <button className="primary" disabled={!name.trim()} onClick={() => void act(async () => { setIssued(await api.createUser(role, name.trim())); setName('') })}>
            Создать
          </button>
          <button onClick={() => void load()}>Обновить</button>
        </div>
      )}
      {issued && (
        <p className="issued">
          {roleLabel[issued.role]} <b>{issued.name}</b>, код <code className="student-code">{issued.id}</code>, токен:{' '}
          <code className="student-code token">{issued.token}</code>{' '}
          <button className="link" onClick={() => void navigator.clipboard.writeText(issued.token).catch(() => undefined)}>Копировать токен</button>{' '}
          <button className="link" onClick={() => void navigator.clipboard.writeText(loginLink(issued.token)).catch(() => undefined)}>Копировать ссылку для входа</button>
        </p>
      )}
      {users && (
        <table className="submissions users">
          <thead>
            <tr><th>Роль</th><th>Имя</th><th>Код</th><th>Создан</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={open?.id === u.id ? 'open' : ''}>
                <td>{roleLabel[u.role]}</td>
                <td>{u.name}</td>
                <td><code className="student-code">{u.id}</code></td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : ''}</td>
                <td className="row-actions">
                  {u.role !== 'admin' && (
                    <>
                      <button className="link" onClick={() => setOpen(open?.id === u.id ? null : u)}>{open?.id === u.id ? 'Закрыть кабинет' : 'Кабинет'}</button>
                      <button className="link" onClick={() => { if (confirm(`Выдать новый токен для ${u.name}? Старый перестанет работать.`)) void act(async () => setIssued(await api.rotateToken(u.id))) }}>Новый токен</button>
                      <button className="link danger" onClick={() => { if (confirm(`Удалить ${u.name} со всеми данными?`)) void act(async () => { await api.deleteUser(u.id); if (open?.id === u.id) setOpen(null) }) }}>Удалить</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && <Cabinet user={open} />}
      {isAdmin && <Reports />}
    </div>
  )
}

/** Кабинет ученика (прогресс и работы) или преподавателя (проверенные работы). */
function Cabinet({ user }: { user: User }) {
  const [items, setItems] = useState<SubmissionMeta[] | null>(null)
  const [state, setState] = useState<{ data: State; updatedAt: string } | null | 'none'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const guard = { alive: true }
    setItems(null)
    setState(null)
    setError(null)
    void (async () => {
      try {
        if (user.role === 'student') {
          const [subs, st] = await Promise.all([
            api.studentSubmissions(user.id),
            api.getState(user.id).then((r) => ({ data: r.data as State, updatedAt: r.updatedAt })).catch(() => 'none' as const),
          ])
          if (!guard.alive) return
          setItems(subs)
          setState(st)
        } else {
          const subs = await api.reviewerSubmissions(user.id)
          if (guard.alive) setItems(subs)
        }
      } catch (e) {
        if (guard.alive) setError(msgOf(e))
      }
    })()
    return () => {
      guard.alive = false
    }
  }, [user])

  const progress = state && state !== 'none' ? Object.values(state.data.progress) : []
  const done = progress.filter((p) => p.status === 'done').length
  const attempts = state && state !== 'none' ? state.data.attempts.length : 0

  return (
    <section className="cabinet">
      <h3>{roleLabel[user.role]} {user.name} <code className="student-code">{user.id}</code></h3>
      {error && <p className="shared-note">{error}</p>}
      {user.role === 'student' && (
        <p className="muted">
          {state === 'none'
            ? 'Прогресс на сервер ещё не сохранялся.'
            : state
              ? `Снимок от ${new Date(state.updatedAt).toLocaleString('ru-RU')}: упражнений начато ${String(progress.length)}, выполнено ${String(done)}, ответов ${String(attempts)}, проверок ${String(Object.keys(state.data.reviews).length)}.`
              : 'Загружаю…'}
        </p>
      )}
      {user.role === 'teacher' && <p className="muted">Работы, проверенные этим преподавателем.</p>}
      <SubmissionTable items={items} />
    </section>
  )
}

/** Отчёты клиентов о проблемах: список и журнал событий выбранного. */
function Reports() {
  const [items, setItems] = useState<Omit<ClientReport, 'events'>[] | null>(null)
  const [full, setFull] = useState<ClientReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await api.reports())
    } catch (e) {
      setError(msgOf(e))
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const fmt = (t: number) => new Date(t).toLocaleTimeString('ru-RU')
  return (
    <section className="cabinet reports">
      <h3>Отчёты о проблемах</h3>
      {error && <p className="shared-note">{error}</p>}
      <div className="tools"><button onClick={() => void load()}>Обновить</button></div>
      {items?.length === 0 && <p className="muted">Отчётов нет.</p>}
      {items !== null && items.length > 0 && (
        <table className="submissions">
          <thead><tr><th>Дата</th><th>Кто</th><th>Описание</th><th>Сборка</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className={full?.id === r.id ? 'open' : ''}>
                <td>{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                <td>{r.userId ? <>{roleLabel[r.role ?? 'student']} <code className="student-code">{r.userId}</code></> : 'аноним'}</td>
                <td>{r.note}</td>
                <td><code className="student-code">{r.build}</code></td>
                <td><button className="link" onClick={() => void api.reportById(r.id).then(setFull).catch((e: unknown) => setError(msgOf(e)))}>Журнал</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {full && (
        <div>
          <p className="muted">Отчёт №{full.id}: {full.url} · {full.userAgent}</p>
          <pre className="report-events">
            {full.events.map((e) => `${fmt(e.t)} [${e.kind}] ${e.msg}${e.data !== undefined ? ' ' + JSON.stringify(e.data) : ''}`).concat(full.events.length === 0 ? ['(пусто)'] : []).join('\n')}
          </pre>
        </div>
      )}
    </section>
  )
}
