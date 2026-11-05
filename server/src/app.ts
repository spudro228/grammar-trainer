// HTTP-обработчик без фреймворка: маршруты /api/*. Отделён от index.ts, чтобы тестировать без сети и базы.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { isClientReportInput, isReview, isRole, isSubmissionInput, type Role, type UserAuth } from '../../shared/api.js'
import { ADMIN_ID, publicUser, type Store } from './store.js'
import { captureError, silentLogger, type Logger } from './log.js'

export interface AppOptions {
  store: Store
  /** Лимит тела запроса в байтах (выгрузка с рисунком может быть большой). */
  bodyLimit?: number
  /** Логгер pino; по умолчанию молчит (тесты). */
  log?: Logger
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

const USER_ID = /^[a-z0-9-]{1,20}$/

/** Сравнение секретов без утечки по времени. */
export function sameSecret(a: string, b: string): boolean {
  if (!a || !b) return false
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Токен из заголовка Authorization: Bearer <token> или из ?key= (ссылка на файл в новой вкладке). */
function tokenOf(req: IncomingMessage, url: URL): string {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')
  return m?.[1] ?? url.searchParams.get('key') ?? ''
}

/** Контекст запроса для логов: кто, что, сколько заняло. */
interface ReqContext {
  requestId: string
  userId?: string
  role?: Role
}

export function createApp(opts: AppOptions): Handler {
  const { store } = opts
  const bodyLimit = opts.bodyLimit ?? 25 * 1024 * 1024
  const log = opts.log ?? silentLogger()

  async function readJson(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of req) {
      const b = chunk as Buffer
      size += b.length
      if (size > bodyLimit) throw new HttpError(413, 'Слишком большой запрос')
      chunks.push(b)
    }
    const text = Buffer.concat(chunks).toString('utf8')
    if (!text.trim()) throw new HttpError(400, 'Пустое тело запроса')
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new HttpError(400, 'Тело запроса не JSON')
    }
  }

  function field(body: unknown, name: string): unknown {
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[name] : undefined
  }
  function nameOf(body: unknown): string {
    const name = field(body, 'name')
    if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Нужно имя')
    if (name.length > 100) throw new HttpError(400, 'Слишком длинное имя')
    return name.trim()
  }

  /** Пользователь по токену запроса или null. Найденный пользователь попадает в контекст логов. */
  async function userOf(req: IncomingMessage, url: URL, ctx: ReqContext): Promise<UserAuth | null> {
    const token = tokenOf(req, url)
    const u = token ? await store.getUserByToken(token) : null
    if (!u || !sameSecret(token, u.token)) return null
    ctx.userId = u.id
    ctx.role = u.role
    return u
  }
  /** Пользователь по токену запроса или 401. */
  async function requireUser(req: IncomingMessage, url: URL, ctx: ReqContext): Promise<UserAuth> {
    const u = await userOf(req, url, ctx)
    if (!u) throw new HttpError(401, 'Нужен токен: войдите на главной')
    return u
  }
  async function requireRole(req: IncomingMessage, url: URL, ctx: ReqContext, ...roles: Role[]): Promise<UserAuth> {
    const u = await requireUser(req, url, ctx)
    if (!roles.includes(u.role)) throw new HttpError(403, `Доступ только для: ${roles.join(', ')}`)
    return u
  }
  /** Данные ученика: сам ученик по своему токену или администратор. */
  async function requireStudentAccess(id: string, req: IncomingMessage, url: URL, ctx: ReqContext): Promise<UserAuth> {
    if (!USER_ID.test(id)) throw new HttpError(400, 'Неверный код ученика')
    const student = await store.getUser(id)
    if (student?.role !== 'student') throw new HttpError(404, 'Ученик не найден')
    const u = await requireUser(req, url, ctx)
    if (u.role !== 'admin' && u.id !== student.id) throw new HttpError(403, 'Это данные другого ученика')
    return student
  }

  async function route(req: IncomingMessage, url: URL, ctx: ReqContext): Promise<{ status: number; body: unknown } | { html: string }> {
    const method = req.method ?? 'GET'
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean) // ['api', ...]
    if (parts[0] !== 'api') throw new HttpError(404, 'Не найдено')
    const [, p1, p2, p3, p4] = parts

    if (p1 === 'health' && method === 'GET') return { status: 200, body: { ok: true } }

    // Кто я: вход по токену.
    if (p1 === 'me' && !p2 && method === 'GET') return { status: 200, body: publicUser(await requireUser(req, url, ctx)) }

    // Отчёт клиента о проблеме: журнал последних действий. Токен не обязателен (ошибка могла быть до входа).
    if (p1 === 'client-logs' && !p2 && method === 'POST') {
      const user = await userOf(req, url, ctx)
      const input = await readJson(req)
      if (!isClientReportInput(input)) throw new HttpError(400, 'Неверный формат отчёта')
      const saved = await store.addClientReport(input, user ? { id: user.id, role: user.role } : null)
      const errors = input.events.filter((e) => e.kind === 'error')
      log.warn(
        { ...ctx, reportId: saved.id, note: input.note, url: input.url, build: input.build, userAgent: input.userAgent, events: input.events.length, errors: errors.slice(-5) },
        'отчёт клиента о проблеме',
      )
      return { status: 201, body: { id: saved.id, createdAt: saved.createdAt } }
    }

    if (p1 === 'students') {
      // Регистрация ученика открыта: имя → код и токен.
      if (!p2 && method === 'POST') return { status: 201, body: await store.createUser('student', nameOf(await readJson(req))) }
      if (p2 && !p3 && method === 'GET') return { status: 200, body: publicUser(await requireStudentAccess(p2, req, url, ctx)) }
      if (p2 && p3 === 'state' && !p4) {
        const student = await requireStudentAccess(p2, req, url, ctx)
        if (method === 'GET') {
          const st = await store.getState(student.id)
          if (!st) throw new HttpError(404, 'Состояние ещё не сохранялось')
          return { status: 200, body: st }
        }
        if (method === 'PUT') {
          const data = await readJson(req)
          if (!Array.isArray(field(data, 'attempts'))) throw new HttpError(400, 'Нет поля attempts')
          const saved = await store.putState(student.id, data)
          return { status: 200, body: { updatedAt: saved.updatedAt } }
        }
      }
      if (p2 && p3 === 'submissions' && !p4) {
        const student = await requireStudentAccess(p2, req, url, ctx)
        if (method === 'GET') return { status: 200, body: await store.listSubmissions({ studentId: student.id }) }
        if (method === 'POST') {
          const input = await readJson(req)
          if (!isSubmissionInput(input)) throw new HttpError(400, 'Нужны exerciseId, book, html, text')
          return { status: 201, body: await store.addSubmission(student.id, input) }
        }
      }
      if (p2 && p3 === 'reviews' && !p4 && method === 'GET') {
        const student = await requireStudentAccess(p2, req, url, ctx)
        return { status: 200, body: await store.listReviews(student.id) }
      }
    }

    if (p1 === 'submissions') {
      if (!p2 && method === 'GET') {
        const student = url.searchParams.get('student')
        const reviewer = url.searchParams.get('reviewer')
        if (student) {
          await requireStudentAccess(student, req, url, ctx)
          return { status: 200, body: await store.listSubmissions({ studentId: student }) }
        }
        const u = await requireRole(req, url, ctx, 'teacher', 'admin')
        if (reviewer) {
          if (u.role !== 'admin' && u.id !== reviewer) throw new HttpError(403, 'Это работы другого преподавателя')
          return { status: 200, body: await store.listSubmissions({ reviewerId: reviewer }) }
        }
        return { status: 200, body: await store.listSubmissions() }
      }
      const id = Number(p2)
      if (!p2 || !Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Неверный номер работы')
      if (!p3 && method === 'GET') {
        const u = await requireUser(req, url, ctx)
        const s = await store.getSubmission(id)
        if (!s) throw new HttpError(404, 'Работа не найдена')
        if (u.role === 'student' && u.id !== s.studentId) throw new HttpError(403, 'Это работа другого ученика')
        return { status: 200, body: { id: s.id, studentId: s.studentId, studentName: s.studentName, exerciseId: s.exerciseId, book: s.book, createdAt: s.createdAt, reviewedAt: s.reviewedAt, reviewedBy: s.reviewedBy, reviewerName: s.reviewerName } }
      }
      if (p3 === 'file' && !p4 && method === 'GET') {
        await requireRole(req, url, ctx, 'teacher', 'admin')
        const s = await store.getSubmission(id)
        if (!s) throw new HttpError(404, 'Работа не найдена')
        return { html: withSubmissionAttrs(s.html, s.id, s.review, url.pathname.replace(/\/file$/, '/review') + url.search) }
      }
      if (p3 === 'review' && !p4 && method === 'POST') {
        const u = await requireRole(req, url, ctx, 'teacher', 'admin')
        const review = await readJson(req)
        if (!isReview(review)) throw new HttpError(400, 'Неверный формат проверки')
        const s = await store.getSubmission(id)
        if (!s) throw new HttpError(404, 'Работа не найдена')
        if (s.exerciseId !== review.exerciseId) throw new HttpError(400, 'Проверка для другого упражнения')
        return { status: 200, body: await store.setReview(id, review, u.id) }
      }
    }

    // Администратор: отчёты клиентов о проблемах.
    if (p1 === 'admin' && p2 === 'reports') {
      await requireRole(req, url, ctx, 'admin')
      if (!p3 && method === 'GET') return { status: 200, body: await store.listClientReports() }
      const id = Number(p3)
      if (p3 && !p4 && method === 'GET' && Number.isInteger(id) && id > 0) {
        const r = await store.getClientReport(id)
        if (!r) throw new HttpError(404, 'Отчёт не найден')
        return { status: 200, body: r }
      }
    }

    // Администратор: пользователи и токены.
    if (p1 === 'admin' && p2 === 'users') {
      await requireRole(req, url, ctx, 'admin')
      if (!p3 && method === 'GET') return { status: 200, body: await store.listUsers() }
      if (!p3 && method === 'POST') {
        const body = await readJson(req)
        const role = field(body, 'role')
        if (!isRole(role) || role === 'admin') throw new HttpError(400, 'Роль: student или teacher')
        return { status: 201, body: await store.createUser(role, nameOf(body)) }
      }
      if (p3 && !USER_ID.test(p3)) throw new HttpError(400, 'Неверный код пользователя')
      if (p3 && !p4 && method === 'DELETE') {
        if (p3 === ADMIN_ID) throw new HttpError(400, 'Администратора удалить нельзя')
        if (!(await store.deleteUser(p3))) throw new HttpError(404, 'Пользователь не найден')
        return { status: 200, body: { ok: true } }
      }
      if (p3 && p4 === 'token' && method === 'POST') {
        if (p3 === ADMIN_ID) throw new HttpError(400, 'Токен администратора задаётся переменной ADMIN_TOKEN')
        const u = await store.rotateToken(p3)
        if (!u) throw new HttpError(404, 'Пользователь не найден')
        return { status: 200, body: u }
      }
    }
    throw new HttpError(404, 'Не найдено')
  }

  return async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const started = process.hrtime.bigint()
    const incoming = req.headers['x-request-id']
    const ctx: ReqContext = { requestId: typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID() }
    res.setHeader('x-request-id', ctx.requestId)
    const method = req.method ?? 'GET'
    // ?key= — секрет, в логи не попадает
    const path = url.pathname + (url.search ? url.search.replace(/([?&]key=)[^&]*/g, '$1***') : '')
    const finish = (status: number, extra: Record<string, unknown> = {}) => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6
      const entry = { ...ctx, method, path, status, ms: Math.round(ms * 10) / 10, ip: req.socket.remoteAddress, ...extra }
      if (status >= 500) log.error(entry, 'запрос завершился ошибкой сервера')
      else if (status >= 400) log.warn(entry, 'запрос отклонён')
      else log.info(entry, 'запрос')
    }
    try {
      const r = await route(req, url, ctx)
      if ('html' in r) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        res.end(r.html)
        finish(200)
        return
      }
      send(res, r.status, r.body)
      finish(r.status)
    } catch (e) {
      if (e instanceof HttpError) {
        send(res, e.status, { error: e.message, requestId: ctx.requestId })
        finish(e.status, { error: e.message })
        return
      }
      const err = e instanceof Error ? e : new Error(String(e))
      captureError(err, { ...ctx, method, path })
      send(res, 500, { error: 'Ошибка сервера', requestId: ctx.requestId })
      finish(500, { err: { message: err.message, stack: err.stack } })
    }
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/**
 * Файл работы для преподавателя: в <body> добавляются data-submission и data-review-url, чтобы набор
 * проверки отправлял результат на сервер (POST reviewUrl), а не скачивал файл.
 * Уже сделанная проверка подставляется в блок review.
 */
export function withSubmissionAttrs(html: string, id: number, review: unknown, reviewUrl: string): string {
  const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  let out = html.replace(/<body\b/, `<body data-submission="${String(id)}" data-review-url="${attr(reviewUrl)}"`)
  if (review) {
    const json = JSON.stringify(review).replace(/</g, '\\u003c')
    out = out.replace(/(<script[^>]*id="review"[^>]*>)[\s\S]*?(<\/script>)/, (_m, a: string, b: string) => `${a}${json}${b}`)
  }
  return out
}
