// Онлайн-цикл целиком с ролями: ученик регистрируется и отправляет работу, преподаватель входит по токену
// и проверяет в файле с сервера, ученик получает проверку, администратор видит кабинеты.
// Сервер настоящий (node:http + MemoryStore), клиент — React в jsdom.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from '../../server/src/app'
import { MemoryStore } from '../../server/src/store'
import { Home } from './Home'
import { App } from '../App'
import { Exercise } from './Exercise'
import { Teacher } from './Teacher'
import { Admin } from './Admin'
import { LoginLink } from './LoginLink'
import { ch01 } from '../content/ch01'
import { getState, resetAll } from '../store'
import { resetOnline, login, probeServer, getOnline } from '../online'
import { pullReviews, pullState, pushState } from '../sync'
import { ReportButton } from './ReportButton'
import { clearLog, log } from '../log'
import { autoReport, resetAutoReport } from '../report'
import type { ExerciseBlock } from '../types'

const ex4 = ch01.blocks.find((b) => b.kind === 'exercise' && b.number === 4) as ExerciseBlock
const ADMIN = 'admin-token-for-ui-tests'

let server: Server
let base = ''
const store = new MemoryStore()

beforeAll(async () => {
  await store.upsertAdmin(ADMIN)
  const handle = createApp({ store })
  server = createServer((req, res) => void handle(req, res))
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/api`
  vi.stubEnv('VITE_API_URL', base)
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await new Promise((r) => server.close(r))
})
beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetAll()
  resetOnline()
})

/** Запускает набор проверки из HTML так, как это делает браузер преподавателя. */
function openKit(html: string) {
  const doc = document.implementation.createHTMLDocument('')
  doc.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '')
  for (const sc of doc.querySelectorAll('script:not([type])')) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- как в браузере
    new Function('document', 'window', sc.textContent ?? '')(doc, window)
  }
  return doc
}

async function loginByToken(token: string) {
  fireEvent.change(await screen.findByLabelText('Токен'), { target: { value: token } })
  fireEvent.click(screen.getByText('Войти по токену'))
  await screen.findByText(/Здравствуйте/)
}

describe('online mode', () => {
  it('home shows offline note when server is unreachable', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:1/api')
    render(<Home onOpen={() => {}} />)
    expect(await screen.findByText(/Сервер недоступен/)).toBeTruthy()
    vi.stubEnv('VITE_API_URL', base)
  })

  it('student registers, submits; teacher reviews online; student receives review; admin sees cabinets', async () => {
    // регистрация ученика на главной
    render(<Home onOpen={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Имя'), { target: { value: 'Дима' } })
    fireEvent.click(screen.getByText('Зарегистрироваться как ученик'))
    await screen.findByText(/Ваш код: [a-z0-9]{4}-[a-z0-9]{4}/)
    const student = getOnline().user
    expect(student?.role).toBe('student')
    expect(student?.token).toMatch(/^[0-9a-f]{48}$/)
    expect(localStorage.getItem('grammar-trainer:session')).toContain(student?.id ?? 'x')
    expect(screen.getByText(student!.token)).toBeTruthy() // токен показан сразу после регистрации
    cleanup()

    // в упражнении появляется кнопка отправки
    render(<Exercise block={ex4} book="Azar" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    fireEvent.change(inputs[1]!, { target: { value: 'are' } })
    fireEvent.change(inputs[2]!, { target: { value: 'are' } })
    fireEvent.click(screen.getByText('Отправить преподавателю'))
    expect(await screen.findByText('Отправлено преподавателю')).toBeTruthy()
    const list = await store.listSubmissions({ studentId: student!.id })
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ exerciseId: '1.04', book: 'Azar', studentName: 'Дима', reviewedAt: null })
    cleanup()

    // ученику кабинет преподавателя закрыт
    render(<Teacher />)
    expect(await screen.findByText(/Нужен вход по токену преподавателя/)).toBeTruthy()
    cleanup()

    // администратор создаёт преподавателя и получает его токен
    login({ id: 'admin', role: 'admin', name: 'Администратор', createdAt: '', token: ADMIN })
    render(<Admin />)
    await screen.findByText('Дима')
    fireEvent.change(screen.getByLabelText('Имя нового пользователя'), { target: { value: 'Анна' } })
    fireEvent.click(screen.getByText('Создать'))
    const issued = await screen.findByText(/токен:/)
    const teacherToken = within(issued).getByText(/^[0-9a-f]{48}$/).textContent ?? ''
    expect(teacherToken).toHaveLength(48)
    cleanup()

    // преподаватель входит по токену и видит работу
    login(null)
    render(<Home onOpen={() => {}} />)
    await loginByToken(teacherToken)
    expect(getOnline().user?.role).toBe('teacher')
    cleanup()
    render(<Teacher />)
    expect(await screen.findByText('Дима')).toBeTruthy()
    const link = screen.getByText<HTMLAnchorElement>('Открыть')
    expect(link.href).toContain(`/api/submissions/${String(list[0]!.id)}/file?key=${teacherToken}`)
    cleanup()

    // файл с сервера: «Сохранить проверку» делает POST, не скачивание
    const html = await (await fetch(link.href)).text()
    expect(html).toContain('data-review-url=')
    const posted: { url: string; body: string }[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      posted.push({ url, body: typeof init?.body === 'string' ? init.body : '' })
      return realFetch(new URL(url, base).toString(), init)
    }) as typeof fetch
    const doc = openKit(html)
    const wrong = doc.querySelector<HTMLElement>('[data-key="1.04|0|3|0"]')!
    wrong.click()
    ;(wrong.nextElementSibling as HTMLElement).textContent = 'is'
    ;(doc.getElementById('rk-comment') as HTMLTextAreaElement).value = 'Смотрите chart 1-1'
    ;(doc.getElementById('rk-save') as HTMLButtonElement).click()
    await waitFor(() => {
      expect(doc.getElementById('rk-status')?.textContent).toContain('Проверка отправлена ученику')
    })
    globalThis.fetch = realFetch
    expect(posted).toHaveLength(1)
    expect(posted[0]!.url).toBe(`/api/submissions/${String(list[0]!.id)}/review?key=${teacherToken}`)
    const after = await store.listSubmissions({ studentId: student!.id })
    expect(after[0]).toMatchObject({ reviewerName: 'Анна' })
    expect(after[0]!.reviewedAt).not.toBeNull()

    // ученик получает проверку
    login(student)
    expect(await pullReviews(student!.id)).toBe(1)
    expect(await pullReviews(student!.id)).toBe(0) // повторно — ничего нового
    const review = getState().reviews['1.04']
    expect(review?.comment).toBe('Смотрите chart 1-1')
    expect(review?.marks['1.04|0|3|0']).toEqual({ wrong: true, fix: 'is' })
    render(<Exercise block={ex4} book="Azar" />)
    expect(screen.getByText(/Проверено преподавателем/)).toBeTruthy()
    expect(screen.getByText('Смотрите chart 1-1')).toBeTruthy()
    cleanup()

    // администратор открывает кабинеты ученика и преподавателя
    login({ id: 'admin', role: 'admin', name: 'Администратор', createdAt: '', token: ADMIN })
    render(<Admin />)
    const rows = await screen.findAllByText('Кабинет')
    const dimaRow = screen.getByText('Дима').closest('tr')!
    fireEvent.click(within(dimaRow).getByText('Кабинет'))
    expect(await screen.findByText(/Прогресс на сервер ещё не сохранялся/)).toBeTruthy()
    expect(screen.getAllByText('Открыть').length).toBeGreaterThan(0)
    const annaRow = screen.getByText('Анна').closest('tr')!
    fireEvent.click(within(annaRow).getByText('Кабинет'))
    expect(await screen.findByText(/Работы, проверенные этим преподавателем/)).toBeTruthy()
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('problem report goes to the server with the journal; admin reads it; auto report is rate limited', async () => {
    clearLog()
    resetAutoReport()
    const s = await store.createUser('student', 'Галя')
    login(s)
    log('action', 'check', { exercise: '1.04' })
    render(<ReportButton />)
    fireEvent.click(screen.getByText('Сообщить о проблеме'))
    fireEvent.change(screen.getByLabelText('Описание проблемы'), { target: { value: 'Кнопка ✓ не нажимается' } })
    fireEvent.click(screen.getByText('Отправить'))
    expect(await screen.findByText(/Отчёт №\d+ отправлен/)).toBeTruthy()
    const reports = await store.listClientReports()
    expect(reports[0]).toMatchObject({ userId: s.id, role: 'student', note: 'Кнопка ✓ не нажимается' })
    const full = await store.getClientReport(reports[0]!.id)
    expect(full?.events.some((e) => e.kind === 'action' && e.msg === 'check')).toBe(true)
    expect(full?.events.some((e) => e.kind === 'api' && e.msg.startsWith('POST /client-logs'))).toBe(false) // запрос самого отчёта идёт после снимка
    cleanup()

    // автоотчёт: не больше трёх за сессию
    for (let i = 0; i < 5; i++) autoReport('test')
    await waitFor(async () => {
      expect((await store.listClientReports()).filter((r) => r.note === 'auto: test')).toHaveLength(3)
    })

    // администратор видит отчёт и журнал
    login({ id: 'admin', role: 'admin', name: 'Администратор', createdAt: '', token: ADMIN })
    render(<Admin />)
    expect(await screen.findByText('Кнопка ✓ не нажимается')).toBeTruthy()
    const row = screen.getByText('Кнопка ✓ не нажимается').closest('tr')!
    fireEvent.click(within(row).getByText('Журнал'))
    expect(await screen.findByText(/\[action\] check \{"exercise":"1.04"\}/)).toBeTruthy()
  })

  it('state round-trip: push, wipe, pull; logout', async () => {
    const s = await store.createUser('student', 'Аня')
    login(s)
    await probeServer(true)
    render(<Exercise block={ex4} book="Azar" />)
    const inputs = screen.getAllByRole<HTMLInputElement>('textbox')
    fireEvent.change(inputs[1]!, { target: { value: 'are' } })
    fireEvent.click(screen.getByText('Проверить'))
    expect(getState().attempts).toHaveLength(1)
    await pushState(s.id)
    resetAll()
    expect(getState().attempts).toHaveLength(0)
    await pullState(s.id)
    expect(getState().attempts).toHaveLength(1)
    expect(getState().progress['1.04']?.status).toBe('partial')
    cleanup()

    render(<Home onOpen={() => {}} />)
    expect(await screen.findByText(s.id)).toBeTruthy()
    fireEvent.click(screen.getByText('Получить проверки'))
    expect(await screen.findByText('Новых проверок нет')).toBeTruthy()
    fireEvent.click(screen.getByText('Выйти'))
    expect(await screen.findByText('Зарегистрироваться как ученик')).toBeTruthy()
    expect(localStorage.getItem('grammar-trainer:session')).toBeNull()
  })

  it('login link signs in and redirects home', async () => {
    const s = await store.createUser('teacher', 'Вера')
    render(<LoginLink token={s.token} />)
    await waitFor(() => {
      expect(getOnline().user?.name).toBe('Вера')
    })
    expect(window.location.hash).toBe('#/')
    cleanup()
    render(<LoginLink token="bad" />)
    expect(await screen.findByText(/Не удалось войти/)).toBeTruthy()
  })

  it('login rejects a wrong token and admin can revoke', async () => {
    render(<Home onOpen={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Токен'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByText('Войти по токену'))
    expect(await screen.findByText(/Вход: Неверный токен|Вход: Нужен токен/)).toBeTruthy()
    const s = await store.createUser('student', 'Боря')
    await loginByToken(s.token)
    expect(getOnline().user?.name).toBe('Боря')
    // после отзыва токена запросы отклоняются
    await store.rotateToken(s.id)
    fireEvent.click(screen.getByText('Получить проверки'))
    expect(await screen.findByText(/Проверки: Нужен токен/)).toBeTruthy()
  })

  it('student selects several exercises and sends them in one go', async () => {
    render(<Home onOpen={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Имя'), { target: { value: 'Оля' } })
    fireEvent.click(screen.getByText('Зарегистрироваться как ученик'))
    await screen.findByText(/Ваш код/)
    const student = getOnline().user!
    cleanup()

    window.location.hash = '#/minna/6'
    render(<App />)
    expect(screen.queryByRole('region', { name: 'Отправка выбранных заданий' })).toBeNull()
    fireEvent.click(await screen.findByLabelText('Выбрать 練習B 1.'))
    fireEvent.click(screen.getByLabelText('Выбрать 問題 1.'))
    expect(screen.queryByLabelText('Выбрать 練習C.')).toBeNull() // устное задание не отправляется
    const bar = screen.getByRole('region', { name: 'Отправка выбранных заданий' })
    expect(within(bar).getByText('Выбрано заданий: 2')).toBeTruthy()
    fireEvent.click(within(bar).getByText('Отправить преподавателю'))
    expect(await screen.findByText('Отправлено преподавателю: 2')).toBeTruthy()
    const list = await store.listSubmissions({ studentId: student.id })
    expect(list.map((x) => x.exerciseId).sort()).toEqual(['mnn6.01', 'mnn6.09'])
    expect(list[0]?.book).toBe('みんなの日本語 初級 I 第2版, 第6課')
    expect(screen.getByLabelText<HTMLInputElement>('Выбрать 練習B 1.').checked).toBe(false) // выбор снят
    window.location.hash = ''
  })

})
