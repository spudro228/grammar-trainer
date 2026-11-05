// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, sameSecret, withSubmissionAttrs } from './app.js'
import { MemoryStore, PgStore, newUserId, newToken, type Store } from './store.js'
import type { Review, SubmissionMeta, User, UserAuth } from '../../shared/api.js'

const ADMIN = 'admin-token-for-tests'
const review: Review = {
  exerciseId: '1.04',
  checkedAt: '2026-10-23T10:00:00.000Z',
  marks: { '1.04|0|2|0': { wrong: true, fix: 'is' } },
  comment: 'Хорошо',
  ink: null,
  inkW: 0,
  inkH: 0,
}
const html = '<!doctype html><html><body data-file="x"><script id="review" type="application/json">{"exerciseId":"1.04"}</script></body></html>'

function start(store: Store) {
  const handle = createApp({ store })
  const server = createServer((req, res) => void handle(req, res))
  return new Promise<{ server: Server; base: string }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({ server, base: `http://127.0.0.1:${String(port)}` })
    })
  })
}

function client(base: string) {
  return async <T>(path: string, init?: { method?: string; json?: unknown; token?: string }) => {
    const headers: Record<string, string> = {}
    const opts: RequestInit = { method: init?.method ?? 'GET', headers }
    if (init?.json !== undefined) {
      headers['content-type'] = 'application/json'
      opts.body = JSON.stringify(init.json)
    }
    if (init?.token) headers.authorization = `Bearer ${init.token}`
    const res = await fetch(base + path, opts)
    const text = await res.text()
    const ct = res.headers.get('content-type') ?? ''
    return { status: res.status, body: (ct.includes('json') ? JSON.parse(text) : text) as T }
  }
}

function apiSuite(name: string, makeStore: () => Promise<Store>, skip = false) {
  describe.skipIf(skip)(name, () => {
    let server: Server
    let api: ReturnType<typeof client>
    let store: Store
    let base = ''
    beforeAll(async () => {
      store = await makeStore()
      await store.upsertAdmin(ADMIN)
      const s = await start(store)
      server = s.server
      base = s.base
      api = client(s.base)
    })
    afterAll(async () => {
      await new Promise((r) => server.close(r))
      await store.close()
    })

    it('health is open, everything else needs a token', async () => {
      expect((await api<{ ok: boolean }>('/api/health')).body).toEqual({ ok: true })
      expect((await api('/api/me')).status).toBe(401)
      expect((await api('/api/submissions')).status).toBe(401)
      expect((await api('/api/admin/users')).status).toBe(401)
      expect((await api('/api/me', { token: 'wrong' })).status).toBe(401)
    })

    it('full cycle: student → state → submission → teacher review → reviews', async () => {
      const created = await api<UserAuth>('/api/students', { method: 'POST', json: { name: ' Дима ' } })
      expect(created.status).toBe(201)
      expect(created.body).toMatchObject({ role: 'student', name: 'Дима' })
      expect(created.body.id).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/)
      expect(created.body.token).toMatch(/^[0-9a-f]{48}$/)
      const { id, token } = created.body

      const me = await api<User>('/api/me', { token })
      expect(me.body).toEqual({ id, role: 'student', name: 'Дима', createdAt: created.body.createdAt })
      expect((await api<User & { token?: string }>(`/api/students/${id}`, { token })).body.token).toBeUndefined()
      expect((await api(`/api/students/${id}`)).status).toBe(401)
      expect((await api('/api/students/zzzz-zzzz', { token })).status).toBe(404)
      expect((await api('/api/students/bad!', { token })).status).toBe(400)

      // чужой ученик не видит данные
      const other = await api<UserAuth>('/api/students', { method: 'POST', json: { name: 'Чужой' } })
      expect((await api(`/api/students/${id}`, { token: other.body.token })).status).toBe(403)
      expect((await api(`/api/students/${id}/state`, { token: other.body.token })).status).toBe(403)

      expect((await api(`/api/students/${id}/state`, { token })).status).toBe(404)
      expect((await api(`/api/students/${id}/state`, { method: 'PUT', json: { nope: 1 }, token })).status).toBe(400)
      const state = { attempts: [{ ts: 1 }], progress: { '1.04': { status: 'done' } }, drafts: {}, reviews: {} }
      const put = await api<{ updatedAt: string }>(`/api/students/${id}/state`, { method: 'PUT', json: state, token })
      expect(put.status).toBe(200)
      const got = await api<{ data: unknown; updatedAt: string }>(`/api/students/${id}/state`, { token })
      expect(got.body.data).toEqual(state)
      // администратор видит кабинет ученика
      expect((await api(`/api/students/${id}/state`, { token: ADMIN })).status).toBe(200)

      const bad = await api(`/api/students/${id}/submissions`, { method: 'POST', json: { exerciseId: '1.04' }, token })
      expect(bad.status).toBe(400)
      const sub = await api<SubmissionMeta>(`/api/students/${id}/submissions`, {
        method: 'POST',
        json: { exerciseId: '1.04', book: 'Azar', html, text: 'txt' },
        token,
      })
      expect(sub.status).toBe(201)
      expect(sub.body).toMatchObject({ studentId: id, studentName: 'Дима', exerciseId: '1.04', book: 'Azar', reviewedAt: null, reviewedBy: null })

      const list = await api<SubmissionMeta[]>(`/api/submissions?student=${id}`, { token })
      expect(list.body.map((s) => s.id)).toEqual([sub.body.id])
      // ученик не видит общий список и файл, преподаватель — видит
      expect((await api('/api/submissions', { token })).status).toBe(403)
      expect((await api(`/api/submissions/${String(sub.body.id)}/file`, { token })).status).toBe(403)
      const teacher = await api<UserAuth>('/api/admin/users', { method: 'POST', json: { role: 'teacher', name: 'Анна' }, token: ADMIN })
      expect(teacher.status).toBe(201)
      const t = teacher.body.token
      const all = await api<SubmissionMeta[]>('/api/submissions', { token: t })
      expect(all.body.some((s) => s.id === sub.body.id)).toBe(true)

      // файл: токен в ?key= (ссылка открывается в новой вкладке)
      const file = await api<string>(`/api/submissions/${String(sub.body.id)}/file?key=${t}`)
      expect(file.status).toBe(200)
      expect(file.body).toContain(`<body data-submission="${String(sub.body.id)}" data-review-url="/api/submissions/${String(sub.body.id)}/review?key=${t}"`)

      const wrongEx = await api(`/api/submissions/${String(sub.body.id)}/review`, { method: 'POST', json: { ...review, exerciseId: '1.05' }, token: t })
      expect(wrongEx.status).toBe(400)
      const broken = await api(`/api/submissions/${String(sub.body.id)}/review`, { method: 'POST', json: { exerciseId: '1.04' }, token: t })
      expect(broken.status).toBe(400)
      expect((await api(`/api/submissions/${String(sub.body.id)}/review`, { method: 'POST', json: review, token })).status).toBe(403)
      const ok = await api<SubmissionMeta>(`/api/submissions/${String(sub.body.id)}/review?key=${t}`, { method: 'POST', json: review })
      expect(ok.status).toBe(200)
      expect(ok.body.reviewedAt).not.toBeNull()
      expect(ok.body).toMatchObject({ reviewedBy: teacher.body.id, reviewerName: 'Анна' })

      const reviews = await api<Review[]>(`/api/students/${id}/reviews`, { token })
      expect(reviews.body).toEqual([review])
      const file2 = await api<string>(`/api/submissions/${String(sub.body.id)}/file`, { token: ADMIN })
      expect(file2.body).toContain('"comment":"Хорошо"')

      // работы преподавателя: сам и администратор
      const mine = await api<SubmissionMeta[]>(`/api/submissions?reviewer=${teacher.body.id}`, { token: t })
      expect(mine.body.map((s) => s.id)).toEqual([sub.body.id])
      expect((await api<SubmissionMeta[]>(`/api/submissions?reviewer=${teacher.body.id}`, { token: ADMIN })).body).toHaveLength(1)
      const teacher2 = await api<UserAuth>('/api/admin/users', { method: 'POST', json: { role: 'teacher', name: 'Борис' }, token: ADMIN })
      expect((await api(`/api/submissions?reviewer=${teacher.body.id}`, { token: teacher2.body.token })).status).toBe(403)

      // вторая работа по тому же упражнению с более новой проверкой побеждает
      const sub2 = await api<SubmissionMeta>(`/api/students/${id}/submissions`, { method: 'POST', json: { exerciseId: '1.04', book: 'Azar', html, text: '' }, token })
      const newer = { ...review, checkedAt: '2026-10-24T10:00:00.000Z', comment: 'Ещё лучше' }
      await api(`/api/submissions/${String(sub2.body.id)}/review`, { method: 'POST', json: newer, token: t })
      expect((await api<Review[]>(`/api/students/${id}/reviews`, { token })).body).toEqual([newer])
      expect((await api<SubmissionMeta[]>(`/api/submissions?student=${id}`, { token })).body.map((s) => s.id)).toEqual([sub2.body.id, sub.body.id])
    })

    it('admin manages users and tokens', async () => {
      const t = await api<UserAuth>('/api/students', { method: 'POST', json: { name: 'Временный' } })
      expect((await api('/api/admin/users', { token: t.body.token })).status).toBe(403)
      const users = await api<User[]>('/api/admin/users', { token: ADMIN })
      expect(users.status).toBe(200)
      expect(users.body.find((u) => u.id === 'admin')).toMatchObject({ role: 'admin' })
      expect(users.body.find((u) => u.id === t.body.id)).toMatchObject({ role: 'student', name: 'Временный' })
      expect(users.body.every((u) => !('token' in u))).toBe(true)

      expect((await api('/api/admin/users', { method: 'POST', json: { role: 'admin', name: 'x' }, token: ADMIN })).status).toBe(400)
      expect((await api('/api/admin/users', { method: 'POST', json: { role: 'teacher', name: '' }, token: ADMIN })).status).toBe(400)

      const rotated = await api<UserAuth>(`/api/admin/users/${t.body.id}/token`, { method: 'POST', token: ADMIN })
      expect(rotated.status).toBe(200)
      expect(rotated.body.token).not.toBe(t.body.token)
      expect((await api('/api/me', { token: t.body.token })).status).toBe(401)
      expect((await api('/api/me', { token: rotated.body.token })).status).toBe(200)
      expect((await api('/api/admin/users/admin/token', { method: 'POST', token: ADMIN })).status).toBe(400)

      expect((await api('/api/admin/users/admin', { method: 'DELETE', token: ADMIN })).status).toBe(400)
      expect((await api(`/api/admin/users/${t.body.id}`, { method: 'DELETE', token: ADMIN })).status).toBe(200)
      expect((await api(`/api/admin/users/${t.body.id}`, { method: 'DELETE', token: ADMIN })).status).toBe(404)
      expect((await api('/api/me', { token: rotated.body.token })).status).toBe(401)
    })

    it('client reports: anonymous and signed, admin reads them', async () => {
      const report = {
        note: 'Кнопка не работает',
        url: 'http://x/#/azar',
        userAgent: 'test',
        build: 'test-build',
        events: [
          { t: 1, kind: 'nav', msg: '#/azar' },
          { t: 2, kind: 'error', msg: 'TypeError: boom', data: { stack: 'at x' } },
        ],
      }
      expect((await api('/api/client-logs', { method: 'POST', json: { note: 1 } })).status).toBe(400)
      const anon = await api<{ id: number }>('/api/client-logs', { method: 'POST', json: report })
      expect(anon.status).toBe(201)
      const s = await api<UserAuth>('/api/students', { method: 'POST', json: { name: 'Жалобщик' } })
      const signed = await api<{ id: number }>('/api/client-logs', { method: 'POST', json: report, token: s.body.token })
      expect(signed.status).toBe(201)

      expect((await api('/api/admin/reports', { token: s.body.token })).status).toBe(403)
      const list = await api<{ id: number; userId: string | null; role: string | null; note: string }[]>('/api/admin/reports', { token: ADMIN })
      expect(list.status).toBe(200)
      const mine = list.body.find((r) => r.id === signed.body.id)
      expect(mine).toMatchObject({ userId: s.body.id, role: 'student', note: 'Кнопка не работает' })
      expect(list.body.find((r) => r.id === anon.body.id)).toMatchObject({ userId: null, role: null })
      expect('events' in (mine ?? {})).toBe(false)
      const full = await api<{ events: unknown[] }>(`/api/admin/reports/${String(signed.body.id)}`, { token: ADMIN })
      expect(full.body.events).toEqual(report.events)
      expect((await api('/api/admin/reports/999999', { token: ADMIN })).status).toBe(404)
    })

    it('answers carry x-request-id and errors include requestId', async () => {
      const res = await fetch(`${base}/api/students/zzzz-zzzz`, { headers: { authorization: `Bearer ${ADMIN}`, 'x-request-id': 'my-request-0001' } })
      expect(res.headers.get('x-request-id')).toBe('my-request-0001')
      expect(await res.json()).toEqual({ error: 'Ученик не найден', requestId: 'my-request-0001' })
      const res2 = await fetch(`${base}/api/health`)
      expect(res2.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('404 for unknown routes and bad ids', async () => {
      expect((await api('/nope')).status).toBe(404)
      expect((await api('/api/nope')).status).toBe(404)
      expect((await api('/api/submissions/abc', { token: ADMIN })).status).toBe(400)
      expect((await api('/api/submissions/999999', { token: ADMIN })).status).toBe(404)
      expect((await api('/api/students/zzzz-zzzz/submissions', { token: ADMIN })).status).toBe(404)
    })
  })
}

apiSuite('api (memory store)', () => Promise.resolve(new MemoryStore()))

const pgUrl = process.env['TEST_DATABASE_URL']
apiSuite(
  'api (postgres)',
  async () => {
    const s = new PgStore(pgUrl ?? '')
    await s.migrate()
    return s
  },
  !pgUrl,
)

describe('helpers', () => {
  it('ids and tokens have the agreed shape and are random', () => {
    const ids = new Set(Array.from({ length: 50 }, newUserId))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/)
    expect(newToken()).toMatch(/^[0-9a-f]{48}$/)
    expect(newToken()).not.toBe(newToken())
  })
  it('sameSecret', () => {
    expect(sameSecret('abc', 'abc')).toBe(true)
    expect(sameSecret('abc', 'abd')).toBe(false)
    expect(sameSecret('abc', 'ab')).toBe(false)
    expect(sameSecret('', '')).toBe(false)
  })
  it('withSubmissionAttrs marks body and injects review', () => {
    expect(withSubmissionAttrs(html, 7, null, '/api/submissions/7/review?key=a&b')).toContain('<body data-submission="7" data-review-url="/api/submissions/7/review?key=a&amp;b" data-file="x">')
    const out = withSubmissionAttrs(html, 7, { exerciseId: '1', comment: '<b>' }, '/r')
    expect(out).toContain('"comment":"\\u003cb>"')
    expect(out).not.toContain('{"exerciseId":"1.04"}</script>')
  })
})
