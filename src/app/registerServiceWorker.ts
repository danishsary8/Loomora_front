import { registerSW } from 'virtual:pwa-register'
import { usePwaUpdate } from './pwaUpdate'

let registered = false
let cleanupControllerListener: (() => void) | undefined

/** Registers the PWA service worker with prompt-controlled updates (no silent auto-reloads). */
export function registerServiceWorker(): void {
  if (registered) return
  registered = true

  let registration: ServiceWorkerRegistration | undefined

  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    const swContainer = navigator.serviceWorker
    let hasController = Boolean(swContainer.controller)
    const onControllerChange = () => {
      // Ignore the initial clientsClaim() transition on first-ever visit unless user confirmed an update;
      // subsequent controllerchange events handle same-session updates even when Workbox._isUpdate was false.
      if (!hasController && !usePwaUpdate.getState().reloadAuthorized) {
        hasController = true
        return
      }
      hasController = true
      usePwaUpdate.getState().handleNeedReload()
    }
    swContainer.addEventListener('controllerchange', onControllerChange)
    cleanupControllerListener = () => {
      swContainer.removeEventListener('controllerchange', onControllerChange)
    }
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, swRegistration) {
      registration = swRegistration
    },
    onNeedRefresh() {
      usePwaUpdate.getState().notifyAvailable(registration?.waiting ?? null)
    },
    onNeedReload() {
      usePwaUpdate.getState().handleNeedReload()
    },
    onRegisterError() {
      usePwaUpdate.getState().handleRegisterError()
    },
  })

  usePwaUpdate.getState().attachController({
    applyUpdate: () => updateServiceWorker(true),
    getRegistration: () => registration,
  })
}

export function resetServiceWorkerForTests(): void {
  cleanupControllerListener?.()
  cleanupControllerListener = undefined
  registered = false
}
