// Клиент HTTP API сервера. Адрес: VITE_API_URL, по умолчанию /api (прокси Vite в разработке, nginx в Docker).
// Все запросы идут с токеном текущего пользователя (Authorization: Bearer).
import type { ApiError, ClientReport, ClientReportInput, Review, Role, StateRecord, SubmissionInput, SubmissionMeta, User, UserAuth } from '../shared/api'
import { getSession } from './session'
import { log } from './log'

/** Читается при каждом запросе: тесты подменяют адрес через vi.stubEnv. */
export const apiBase = (): string => (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: { method?: string; json?: unknown; token?: string }): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (init?.json !== undefined) headers['content-type'] = 'application/json'
  const token = init?.token ?? getSession()?.token
  if (token) headers.authorization = `Bearer ${token}`
  const method = init?.method ?? 'GET'
  const shortPath = path.replace(/([?&]key=)[^&]*/g, '$1***')
  const started = performance.now()
  const done = (status: number, extra?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - started)
    log(status >= 400 || status === 0 ? 'error' : 'api', `${method} ${shortPath} → ${String(status)}`, { ms, ...extra })
  }
  let res: Response
  try {
    res = await fetch(apiBase() + path, { method, headers, body: init?.json === undefined ? null : JSON.stringify(init.json) })
  } catch (e) {
    done(0, { network: e instanceof Error ? e.message : String(e) })
    throw new ApiRequestError(0, 'Сервер недоступен')
  }
  const requestId = res.headers.get('x-request-id') ?? undefined
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? (JSON.parse(text) as unknown) : null
  } catch {
    // Не JSON: ответ прокси или веб-сервера, а не API (API лежит или не настроен).
    done(res.status, { requestId, notJson: true })
    throw new ApiRequestError(res.status, res.status >= 500 ? 'Сервер недоступен' : 'Сервер ответил не JSON')
  }
  if (!res.ok) {
    const msg = typeof body === 'object' && body !== null && typeof (body as ApiError).error === 'string' ? (body as ApiError).error : `Ошибка ${String(res.status)}`
    done(res.status, { requestId, error: msg })
    throw new ApiRequestError(res.status, requestId && res.status >= 500 ? `${msg} (код ${requestId.slice(0, 8)})` : msg)
  }
  done(res.status, { requestId })
  return body as T
}

const enc = encodeURIComponent

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  /** Кто я по токену (вход на другом устройстве). */
  me: (token: string) => request<User>('/me', { token }),
  register: (name: string) => request<UserAuth>('/students', { method: 'POST', json: { name } }),
  getState: (id: string) => request<StateRecord>(`/students/${enc(id)}/state`),
  putState: (id: string, data: unknown) => request<{ updatedAt: string }>(`/students/${enc(id)}/state`, { method: 'PUT', json: data }),
  submit: (id: string, input: SubmissionInput) => request<SubmissionMeta>(`/students/${enc(id)}/submissions`, { method: 'POST', json: input }),
  myReviews: (id: string) => request<Review[]>(`/students/${enc(id)}/reviews`),
  studentSubmissions: (id: string) => request<SubmissionMeta[]>(`/submissions?student=${enc(id)}`),
  reviewerSubmissions: (id: string) => request<SubmissionMeta[]>(`/submissions?reviewer=${enc(id)}`),
  allSubmissions: () => request<SubmissionMeta[]>('/submissions'),
  users: () => request<User[]>('/admin/users'),
  createUser: (role: Role, name: string) => request<UserAuth>('/admin/users', { method: 'POST', json: { role, name } }),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/admin/users/${enc(id)}`, { method: 'DELETE' }),
  rotateToken: (id: string) => request<UserAuth>(`/admin/users/${enc(id)}/token`, { method: 'POST' }),
  report: (input: ClientReportInput) => request<{ id: number; createdAt: string }>('/client-logs', { method: 'POST', json: input }),
  reports: () => request<Omit<ClientReport, 'events'>[]>('/admin/reports'),
  reportById: (id: number) => request<ClientReport>(`/admin/reports/${String(id)}`),
  /** Ссылка на файл работы (открывается в новой вкладке, токен в адресе). */
  fileUrl: (id: number) => {
    const token = getSession()?.token ?? ''
    return `${apiBase()}/submissions/${String(id)}/file${token ? `?key=${enc(token)}` : ''}`
  },
}
