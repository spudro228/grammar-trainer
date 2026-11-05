// Sentry/GlitchTip в браузере: включается только при VITE_SENTRY_DSN, SDK грузится отдельным чанком.
import { BUILD } from './log'

export async function initSentry(): Promise<boolean> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return false
  const Sentry = await import('@sentry/browser')
  Sentry.init({ dsn, release: BUILD, environment: import.meta.env.MODE })
  return true
}
