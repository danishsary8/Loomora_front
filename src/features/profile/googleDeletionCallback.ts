export const googleDeletionCallbackPath = '/auth/google/deletion/callback'

export function isGoogleDeletionCallbackPath(pathname: string) {
  return pathname.toLowerCase().replace(/\/+$/, '') === googleDeletionCallbackPath
}

function scrubCallback() {
  const { pathname, search, hash } = window.location
  if (!isGoogleDeletionCallbackPath(pathname) || (!search && !hash)) return null

  window.history.replaceState(window.history.state, '', pathname)
  return pathname === googleDeletionCallbackPath ? new URLSearchParams(search) : null
}

// Imported before the router or any service worker registration.
let callback = scrubCallback()

export function takeGoogleDeletionCallback() {
  const params = callback
  callback = null
  return params
}
