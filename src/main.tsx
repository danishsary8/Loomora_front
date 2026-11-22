import { isGoogleDeletionCallbackPath } from '@/features/profile/googleDeletionCallback'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { registerServiceWorker } from '@/app/registerServiceWorker'
import { clearGoogleDeletionChallenge } from '@/features/profile/googleDeletion'
import '@/i18n'
import '@/styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

const isDeletionCallback = isGoogleDeletionCallbackPath(window.location.pathname)
if (!isDeletionCallback) clearGoogleDeletionChallenge()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (!isDeletionCallback) {
  if (document.readyState === 'complete') {
    registerServiceWorker()
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true })
  }
}
