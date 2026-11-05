// Общие типы клиента и сервера. Файл не импортирует ничего: его читают оба tsconfig.

export interface ReviewMark {
  wrong: boolean
  fix: string
}

/** Проверка преподавателя. Из файла exercise-<id>-checked.html или с сервера. */
export interface Review {
  exerciseId: string
  checkedAt: string
  /** Ключ пропуска (draftKey) → отметка. */
  marks: Record<string, ReviewMark>
  comment: string
  /** Рукописные пометки: PNG data URL всей страницы выгрузки. */
  ink: string | null
  inkW: number
  inkH: number
}

export type Role = 'student' | 'teacher' | 'admin'
export const ROLES: readonly Role[] = ['student', 'teacher', 'admin']
export const roleLabel: Record<Role, string> = { student: 'ученик', teacher: 'преподаватель', admin: 'администратор' }

export interface User {
  id: string
  role: Role
  name: string
  createdAt: string
}

/** Пользователь с секретным токеном. Токен показывается при создании и при смене; все запросы идут с ним. */
export interface UserAuth extends User {
  token: string
}

export interface StateRecord {
  data: unknown
  updatedAt: string
}

export interface SubmissionInput {
  exerciseId: string
  book: string
  html: string
  text: string
}

export interface SubmissionMeta {
  id: number
  studentId: string
  studentName: string
  exerciseId: string
  book: string
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  reviewerName: string | null
}

export interface ApiError {
  error: string
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

export const isRole = (x: unknown): x is Role => typeof x === 'string' && (ROLES as readonly string[]).includes(x)

export function isReviewMark(x: unknown): x is ReviewMark {
  return isRecord(x) && typeof x['wrong'] === 'boolean' && typeof x['fix'] === 'string'
}

/** Проверка формы Review без доверия к источнику (файл, сеть). */
export function isReview(x: unknown): x is Review {
  if (!isRecord(x)) return false
  if (typeof x['exerciseId'] !== 'string' || typeof x['checkedAt'] !== 'string') return false
  if (typeof x['comment'] !== 'string') return false
  if (!(x['ink'] === null || typeof x['ink'] === 'string')) return false
  if (typeof x['inkW'] !== 'number' || typeof x['inkH'] !== 'number') return false
  const marks = x['marks']
  return isRecord(marks) && Object.values(marks).every(isReviewMark)
}

export function isSubmissionInput(x: unknown): x is SubmissionInput {
  return (
    isRecord(x) &&
    typeof x['exerciseId'] === 'string' &&
    x['exerciseId'] !== '' &&
    typeof x['book'] === 'string' &&
    typeof x['html'] === 'string' &&
    x['html'] !== '' &&
    typeof x['text'] === 'string'
  )
}

// ---------- отчёты клиента о проблемах ----------

export type ClientLogKind = 'nav' | 'action' | 'api' | 'error' | 'info'

/** Событие из журнала клиента (кольцевой буфер последних действий). */
export interface ClientLogEvent {
  /** Unix-время, мс. */
  t: number
  kind: ClientLogKind
  msg: string
  data?: unknown
}

export interface ClientReportInput {
  note: string
  url: string
  userAgent: string
  /** Сборка клиента (дата/хеш), чтобы сопоставить с кодом. */
  build: string
  events: ClientLogEvent[]
}

export interface ClientReport extends ClientReportInput {
  id: number
  userId: string | null
  role: Role | null
  createdAt: string
}

export const CLIENT_LOG_KINDS: readonly ClientLogKind[] = ['nav', 'action', 'api', 'error', 'info']

export function isClientLogEvent(x: unknown): x is ClientLogEvent {
  return (
    isRecord(x) &&
    typeof x['t'] === 'number' &&
    typeof x['kind'] === 'string' &&
    (CLIENT_LOG_KINDS as readonly string[]).includes(x['kind']) &&
    typeof x['msg'] === 'string' &&
    x['msg'].length <= 1000
  )
}

export function isClientReportInput(x: unknown): x is ClientReportInput {
  return (
    isRecord(x) &&
    typeof x['note'] === 'string' &&
    x['note'].length <= 4000 &&
    typeof x['url'] === 'string' &&
    typeof x['userAgent'] === 'string' &&
    typeof x['build'] === 'string' &&
    Array.isArray(x['events']) &&
    x['events'].length <= 500 &&
    x['events'].every(isClientLogEvent)
  )
}
