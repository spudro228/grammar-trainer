// Ловит ошибки рендера React: пишет в журнал, отправляет отчёт, показывает что делать.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { describeError, log } from '../log'
import { autoReport } from '../report'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    log('error', 'react render', { ...describeError(error), component: info.componentStack?.split('\n').slice(0, 6).join('\n') })
    autoReport('react render')
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="home">
        <header className="home-head">
          <h1>Что-то сломалось</h1>
          <p className="muted">Ошибка записана и отправлена разработчику, если сервер доступен. Ответы и прогресс сохранены в браузере.</p>
          <pre className="error-text">{describeError(this.state.error).message}</pre>
          <div className="tools">
            <button className="primary" onClick={() => window.location.reload()}>Перезагрузить</button>
            <a className="button" href="#/" onClick={() => this.setState({ error: null })}>На главную</a>
          </div>
        </header>
      </div>
    )
  }
}
