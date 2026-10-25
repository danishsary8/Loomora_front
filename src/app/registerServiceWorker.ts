import { registerSW } from 'virtual:pwa-register'

/** Caches the app shell so Loomora opens offline; updates itself when a new version ships. */
export function registerServiceWorker(): void {
  registerSW({ immediate: true })
}
