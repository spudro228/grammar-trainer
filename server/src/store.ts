// Хранилище сервера: интерфейс, реализация в памяти (тесты) и на Postgres.
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import type { ClientReport, ClientReportInput, Review, Role, StateRecord, SubmissionInput, SubmissionMeta, User, UserAuth } from '../../shared/api.js'

export interface Submission extends SubmissionMeta {
  html: string
  text: string
  review: Review | null
}

export interface SubmissionFilter {
  studentId?: string
  reviewerId?: string
}

export const ADMIN_ID = 'admin'

export interface Store {
  createUser(role: Role, name: string): Promise<UserAuth>
  getUser(id: string): Promise<UserAuth | null>
  getUserByToken(token: string): Promise<UserAuth | null>
  listUsers(): Promise<User[]>
  deleteUser(id: string): Promise<boolean>
  rotateToken(id: string): Promise<UserAuth | null>
  /** Создаёт или обновляет администратора с заданным токеном (из переменной окружения). */
  upsertAdmin(token: string): Promise<UserAuth>
  getState(studentId: string): Promise<StateRecord | null>
  putState(studentId: string, data: unknown): Promise<StateRecord>
  addSubmission(studentId: string, input: SubmissionInput): Promise<SubmissionMeta>
  /** Новые сверху. Без фильтра — все работы. */
  listSubmissions(filter?: SubmissionFilter): Promise<SubmissionMeta[]>
  getSubmission(id: number): Promise<Submission | null>
  setReview(id: number, review: Review, reviewerId: string): Promise<SubmissionMeta | null>
  /** Последняя проверка по каждому упражнению ученика. */
  listReviews(studentId: string): Promise<Review[]>
  addClientReport(input: ClientReportInput, user: { id: string; role: Role } | null): Promise<ClientReport>
  /** Новые сверху, без событий (они в getClientReport). */
  listClientReports(limit?: number): Promise<Omit<ClientReport, 'events'>[]>
  getClientReport(id: number): Promise<ClientReport | null>
  close(): Promise<void>
}

/** Код пользователя: 8 знаков без похожих символов, вида k7f3-9q2x. */
export function newUserId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(8)
  let s = ''
  for (let i = 0; i < 8; i++) {
    const b = bytes[i] ?? 0
    s += alphabet[b % alphabet.length] ?? ''
    if (i === 3) s += '-'
  }
  return s
}

/** Секретный токен: 48 hex-знаков. */
export const newToken = () => randomBytes(24).toString('hex')

const now = () => new Date().toISOString()
export const publicUser = (u: UserAuth): User => ({ id: u.id, role: u.role, name: u.name, createdAt: u.createdAt })

// ---------- в памяти ----------

export class MemoryStore implements Store {
  private users = new Map<string, UserAuth>()
  private states = new Map<string, StateRecord>()
  private submissions: Submission[] = []
  private reports: ClientReport[] = []
  private seq = 0

  createUser(role: Role, name: string): Promise<UserAuth> {
    const u: UserAuth = { id: newUserId(), role, name, createdAt: now(), token: newToken() }
    this.users.set(u.id, u)
    return Promise.resolve(u)
  }
  getUser(id: string): Promise<UserAuth | null> {
    return Promise.resolve(this.users.get(id) ?? null)
  }
  getUserByToken(token: string): Promise<UserAuth | null> {
    for (const u of this.users.values()) if (u.token === token) return Promise.resolve(u)
    return Promise.resolve(null)
  }
  listUsers(): Promise<User[]> {
    return Promise.resolve([...this.users.values()].map(publicUser))
  }
  deleteUser(id: string): Promise<boolean> {
    const ok = this.users.delete(id)
    if (ok) {
      this.states.delete(id)
      this.submissions = this.submissions.filter((s) => s.studentId !== id)
      for (const s of this.submissions) if (s.reviewedBy === id) { s.reviewedBy = null; s.reviewerName = null }
    }
    return Promise.resolve(ok)
  }
  rotateToken(id: string): Promise<UserAuth | null> {
    const u = this.users.get(id)
    if (!u) return Promise.resolve(null)
    u.token = newToken()
    return Promise.resolve(u)
  }
  upsertAdmin(token: string): Promise<UserAuth> {
    const prev = this.users.get(ADMIN_ID)
    const u: UserAuth = { id: ADMIN_ID, role: 'admin', name: 'Администратор', createdAt: prev?.createdAt ?? now(), token }
    this.users.set(ADMIN_ID, u)
    return Promise.resolve(u)
  }
  getState(studentId: string): Promise<StateRecord | null> {
    return Promise.resolve(this.states.get(studentId) ?? null)
  }
  putState(studentId: string, data: unknown): Promise<StateRecord> {
    const r: StateRecord = { data, updatedAt: now() }
    this.states.set(studentId, r)
    return Promise.resolve(r)
  }
  addSubmission(studentId: string, input: SubmissionInput): Promise<SubmissionMeta> {
    const student = this.users.get(studentId)
    if (!student) throw new Error('no student')
    const s: Submission = {
      id: ++this.seq,
      studentId,
      studentName: student.name,
      exerciseId: input.exerciseId,
      book: input.book,
      html: input.html,
      text: input.text,
      createdAt: now(),
      reviewedAt: null,
      reviewedBy: null,
      reviewerName: null,
      review: null,
    }
    this.submissions.push(s)
    return Promise.resolve(meta(s))
  }
  listSubmissions(filter: SubmissionFilter = {}): Promise<SubmissionMeta[]> {
    const list = this.submissions.filter(
      (s) =>
        (filter.studentId === undefined || s.studentId === filter.studentId) &&
        (filter.reviewerId === undefined || s.reviewedBy === filter.reviewerId),
    )
    return Promise.resolve(list.map(meta).reverse())
  }
  getSubmission(id: number): Promise<Submission | null> {
    return Promise.resolve(this.submissions.find((s) => s.id === id) ?? null)
  }
  setReview(id: number, review: Review, reviewerId: string): Promise<SubmissionMeta | null> {
    const s = this.submissions.find((x) => x.id === id)
    if (!s) return Promise.resolve(null)
    s.review = review
    s.reviewedAt = now()
    s.reviewedBy = reviewerId
    s.reviewerName = this.users.get(reviewerId)?.name ?? null
    return Promise.resolve(meta(s))
  }
  listReviews(studentId: string): Promise<Review[]> {
    const latest = new Map<string, Review>()
    for (const s of this.submissions) {
      if (s.studentId !== studentId || !s.review) continue
      const prev = latest.get(s.exerciseId)
      if (!prev || prev.checkedAt < s.review.checkedAt) latest.set(s.exerciseId, s.review)
    }
    return Promise.resolve([...latest.values()])
  }
  addClientReport(input: ClientReportInput, user: { id: string; role: Role } | null): Promise<ClientReport> {
    const r: ClientReport = { ...input, id: this.reports.length + 1, userId: user?.id ?? null, role: user?.role ?? null, createdAt: now() }
    this.reports.push(r)
    return Promise.resolve(r)
  }
  listClientReports(limit = 100): Promise<Omit<ClientReport, 'events'>[]> {
    return Promise.resolve([...this.reports].reverse().slice(0, limit).map(({ events: _e, ...rest }) => rest))
  }
  getClientReport(id: number): Promise<ClientReport | null> {
    return Promise.resolve(this.reports.find((r) => r.id === id) ?? null)
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}

function meta(s: Submission): SubmissionMeta {
  return {
    id: s.id,
    studentId: s.studentId,
    studentName: s.studentName,
    exerciseId: s.exerciseId,
    book: s.book,
    createdAt: s.createdAt,
    reviewedAt: s.reviewedAt,
    reviewedBy: s.reviewedBy,
    reviewerName: s.reviewerName,
  }
}

// ---------- Postgres ----------

interface UserRow { id: string; role: Role; name: string; token: string; created_at: Date }
interface StateRow { data: unknown; updated_at: Date }
interface SubmissionRow {
  id: number
  student_id: string
  student_name: string
  exercise_id: string
  book: string
  created_at: Date
  reviewed_at: Date | null
  reviewed_by: string | null
  reviewer_name: string | null
}
interface SubmissionFullRow extends SubmissionRow { html: string; text: string; review: Review | null }

const META_SQL = `select s.id, s.student_id, st.name as student_name, s.exercise_id, s.book, s.created_at, s.reviewed_at, s.reviewed_by, t.name as reviewer_name
  from submissions s join users st on st.id = s.student_id left join users t on t.id = s.reviewed_by`

export class PgStore implements Store {
  private pool: pg.Pool
  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString })
  }

  /** Создаёт таблицы, если их нет. */
  async migrate(): Promise<void> {
    const sql = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8')
    await this.pool.query(sql)
  }

  async createUser(role: Role, name: string): Promise<UserAuth> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await this.pool.query<UserRow>(
        'insert into users (id, role, name, token) values ($1, $2, $3, $4) on conflict (id) do nothing returning *',
        [newUserId(), role, name, newToken()],
      )
      const row = r.rows[0]
      if (row) return userOf(row)
    }
    throw new Error('не удалось выбрать уникальный код пользователя')
  }
  async getUser(id: string): Promise<UserAuth | null> {
    const r = await this.pool.query<UserRow>('select * from users where id = $1', [id])
    const row = r.rows[0]
    return row ? userOf(row) : null
  }
  async getUserByToken(token: string): Promise<UserAuth | null> {
    const r = await this.pool.query<UserRow>('select * from users where token = $1', [token])
    const row = r.rows[0]
    return row ? userOf(row) : null
  }
  async listUsers(): Promise<User[]> {
    const r = await this.pool.query<UserRow>('select * from users order by created_at, id')
    return r.rows.map((row) => publicUser(userOf(row)))
  }
  async deleteUser(id: string): Promise<boolean> {
    const r = await this.pool.query('delete from users where id = $1', [id])
    return (r.rowCount ?? 0) > 0
  }
  async rotateToken(id: string): Promise<UserAuth | null> {
    const r = await this.pool.query<UserRow>('update users set token = $2 where id = $1 returning *', [id, newToken()])
    const row = r.rows[0]
    return row ? userOf(row) : null
  }
  async upsertAdmin(token: string): Promise<UserAuth> {
    const r = await this.pool.query<UserRow>(
      `insert into users (id, role, name, token) values ($1, 'admin', 'Администратор', $2)
       on conflict (id) do update set token = excluded.token, role = 'admin' returning *`,
      [ADMIN_ID, token],
    )
    const row = r.rows[0]
    if (!row) throw new Error('upsertAdmin: нет строки')
    return userOf(row)
  }
  async getState(studentId: string): Promise<StateRecord | null> {
    const r = await this.pool.query<StateRow>('select data, updated_at from states where student_id = $1', [studentId])
    const row = r.rows[0]
    return row ? { data: row.data, updatedAt: row.updated_at.toISOString() } : null
  }
  async putState(studentId: string, data: unknown): Promise<StateRecord> {
    const r = await this.pool.query<StateRow>(
      `insert into states (student_id, data, updated_at) values ($1, $2, now())
       on conflict (student_id) do update set data = excluded.data, updated_at = now()
       returning data, updated_at`,
      [studentId, JSON.stringify(data)],
    )
    const row = r.rows[0]
    if (!row) throw new Error('putState: нет строки')
    return { data: row.data, updatedAt: row.updated_at.toISOString() }
  }
  async addSubmission(studentId: string, input: SubmissionInput): Promise<SubmissionMeta> {
    const r = await this.pool.query<{ id: number }>(
      'insert into submissions (student_id, exercise_id, book, html, text) values ($1, $2, $3, $4, $5) returning id',
      [studentId, input.exerciseId, input.book, input.html, input.text],
    )
    const id = r.rows[0]?.id
    if (id === undefined) throw new Error('addSubmission: нет id')
    const m = await this.metaOf(id)
    if (!m) throw new Error('addSubmission: запись не найдена')
    return m
  }
  private async metaOf(id: number): Promise<SubmissionMeta | null> {
    const r = await this.pool.query<SubmissionRow>(`${META_SQL} where s.id = $1`, [id])
    const row = r.rows[0]
    return row ? metaOf(row) : null
  }
  async listSubmissions(filter: SubmissionFilter = {}): Promise<SubmissionMeta[]> {
    const where: string[] = []
    const params: string[] = []
    if (filter.studentId !== undefined) {
      params.push(filter.studentId)
      where.push(`s.student_id = $${String(params.length)}`)
    }
    if (filter.reviewerId !== undefined) {
      params.push(filter.reviewerId)
      where.push(`s.reviewed_by = $${String(params.length)}`)
    }
    const sql = `${META_SQL}${where.length ? ` where ${where.join(' and ')}` : ''} order by s.created_at desc, s.id desc`
    const r = await this.pool.query<SubmissionRow>(sql, params)
    return r.rows.map(metaOf)
  }
  async getSubmission(id: number): Promise<Submission | null> {
    const r = await this.pool.query<SubmissionFullRow>(
      `${META_SQL.replace('s.created_at,', 's.created_at, s.html, s.text, s.review,')} where s.id = $1`,
      [id],
    )
    const row = r.rows[0]
    return row ? { ...metaOf(row), html: row.html, text: row.text, review: row.review } : null
  }
  async setReview(id: number, review: Review, reviewerId: string): Promise<SubmissionMeta | null> {
    const r = await this.pool.query<{ id: number }>(
      'update submissions set review = $2, reviewed_at = now(), reviewed_by = $3 where id = $1 returning id',
      [id, JSON.stringify(review), reviewerId],
    )
    if (!r.rows[0]) return null
    return this.metaOf(id)
  }
  async listReviews(studentId: string): Promise<Review[]> {
    const r = await this.pool.query<{ review: Review }>(
      `select distinct on (exercise_id) review from submissions
       where student_id = $1 and review is not null
       order by exercise_id, (review->>'checkedAt') desc, id desc`,
      [studentId],
    )
    return r.rows.map((row) => row.review)
  }
  async addClientReport(input: ClientReportInput, user: { id: string; role: Role } | null): Promise<ClientReport> {
    const r = await this.pool.query<ReportRow>(
      `insert into client_reports (user_id, role, note, url, user_agent, build, events) values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [user?.id ?? null, user?.role ?? null, input.note, input.url, input.userAgent, input.build, JSON.stringify(input.events)],
    )
    const row = r.rows[0]
    if (!row) throw new Error('addClientReport: нет строки')
    return reportOf(row)
  }
  async listClientReports(limit = 100): Promise<Omit<ClientReport, 'events'>[]> {
    const r = await this.pool.query<ReportRow>('select id, user_id, role, note, url, user_agent, build, created_at from client_reports order by created_at desc, id desc limit $1', [limit])
    return r.rows.map((row) => {
      const { events: _e, ...rest } = reportOf({ ...row, events: [] })
      return rest
    })
  }
  async getClientReport(id: number): Promise<ClientReport | null> {
    const r = await this.pool.query<ReportRow>('select * from client_reports where id = $1', [id])
    const row = r.rows[0]
    return row ? reportOf(row) : null
  }
  async close(): Promise<void> {
    await this.pool.end()
  }
}

interface ReportRow {
  id: number
  user_id: string | null
  role: Role | null
  note: string
  url: string
  user_agent: string
  build: string
  events: ClientReport['events']
  created_at: Date
}
const reportOf = (r: ReportRow): ClientReport => ({
  id: r.id,
  userId: r.user_id,
  role: r.role,
  note: r.note,
  url: r.url,
  userAgent: r.user_agent,
  build: r.build,
  events: r.events,
  createdAt: r.created_at.toISOString(),
})

const userOf = (r: UserRow): UserAuth => ({ id: r.id, role: r.role, name: r.name, token: r.token, createdAt: r.created_at.toISOString() })
const metaOf = (r: SubmissionRow): SubmissionMeta => ({
  id: r.id,
  studentId: r.student_id,
  studentName: r.student_name,
  exerciseId: r.exercise_id,
  book: r.book,
  createdAt: r.created_at.toISOString(),
  reviewedAt: r.reviewed_at ? r.reviewed_at.toISOString() : null,
  reviewedBy: r.reviewed_by,
  reviewerName: r.reviewer_name,
})
