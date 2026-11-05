// Вход по ссылке #/login/<токен>: удобно выдавать ученику. Токен не уходит на сервер в адресе (hash), но
// остаётся в истории браузера — для публичного интернета лучше вводить токен вручную.
import { useEffect, useState } from 'react'
import { api } from '../api'
import { login } from '../online'

export function LoginLink({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api
      .me(token)
      .then((u) => {
        login({ ...u, token })
        window.location.replace('#/')
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [token])
  return (
    <div className="home">
      <header className="home-head">
        <h1>Вход</h1>
        <p className="muted">{error ? `Не удалось войти: ${error}` : 'Проверяю токен…'}</p>
        {error && <p><a href="#/">На главную</a></p>}
      </header>
    </div>
  )
}

/** Ссылка для входа по токену на этом же сайте. */
export const loginLink = (token: string) => `${window.location.origin}${window.location.pathname}#/login/${token}`
