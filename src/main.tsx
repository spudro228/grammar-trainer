import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installGlobalHandlers, log, BUILD } from './log'
import { autoReport } from './report'
import { initSentry } from './sentry'
import './styles.css'

installGlobalHandlers((e) => autoReport(e instanceof Error ? e.message : String(e)))
void initSentry()
log('info', 'start', { build: BUILD, lang: navigator.language, screen: `${String(window.innerWidth)}x${String(window.innerHeight)}` })

const root = document.getElementById('root')
if (!root) throw new Error('Нет элемента #root')
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
