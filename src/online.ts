// Онлайн-режим: доступен ли сервер и кто вошёл.
import { useSyncExternalStore } from 'react'
import { api } from './api'
import { getSession, onSessionChange, reloadSession, setSession } from './session'
import type { UserAuth } from '../shared/api'

export type Availability = 'unknown' | 'online' | 'offline'

interface Online {
  availability: Availability
  user: UserAuth | null
}

let state: Online = { availability: 'unknown', user: getSession() }
const listeners = new Set<() => void>()
function commit(next: Online) {
  state = next
  listeners.forEach((l) => {
    l()
  })
}
onSessionChange(() => {
  commit({ ...state, user: getSession() })
})

export const getOnline = () => state
export const login = (u: UserAuth | null) => {
  setSession(u)
}

let probe: Promise<Availability> | null = null
/** Один запрос /health на сессию; повтор по `force`. */
export function probeServer(force = false): Promise<Availability> {
  if (probe && !force) return probe
  probe = api
    .health()
    .then(() => 'online' as const)
    .catch(() => 'offline' as const)
    .then((a) => {
      commit({ ...state, availability: a })
      return a
    })
  return probe
}

/** Для тестов: сброс кэша проверки сервера и перечитывание сессии. */
export function resetOnline() {
  probe = null
  reloadSession()
  state = { availability: 'unknown', user: getSession() }
}

export function useOnline(): Online {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Текущий ученик, если сервер доступен и вошёл именно ученик. */
export function useStudent(): UserAuth | null {
  const o = useOnline()
  return o.availability === 'online' && o.user?.role === 'student' ? o.user : null
}
