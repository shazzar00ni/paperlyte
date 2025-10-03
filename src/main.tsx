import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import { registerSW } from 'virtual:pwa-register'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error(
    'Failed to find the root element. Make sure there is a <div id="root"></div> in your HTML.'
  )
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Optional: Show a prompt to refresh when new content is available
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('New content available, please refresh.')
      }
    },
    onOfflineReady() {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('App is ready to work offline.')
      }
    },
    onRegistered(registration) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('Service Worker registered:', registration)
      }
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('Service Worker registration failed:', error)
    },
  })
}
