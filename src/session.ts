// Сессия: кто вошёл (роль, имя, код, токен). Хранится в localStorage отдельно от прогресса.
import { isRole, type UserAuth } from '../shared/api'

const KEY = 'grammar-trainer:session'
let session: UserAuth | null = load()

function load(): UserAuth | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<UserAuth>
    if (typeof s.id !== 'string' || typeof s.name !== 'string' || typeof s.token !== 'string' || !isRole(s.role)) return null
    return { id: s.id, name: s.name, token: s.token, role: s.role, createdAt: s.createdAt ?? '' }
  } catch {
    return null
  }
}

export const getSession = () => session

const listeners = new Set<() => void>()
export function onSessionChange(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setSession(next: UserAuth | null) {
  session = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => {
    l()
  })
}

/** Для тестов. */
export function reloadSession() {
  session = load()
}
