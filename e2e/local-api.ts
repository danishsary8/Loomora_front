// Reserved TLD. Local browser tests use route fixtures, never a deployed API.
export const LOCAL_API_ORIGIN = 'https://loomora-api.e2e.invalid'

export const PRODUCTION_API_ORIGIN = 'https://loomora-api.onrender.com'

export function localHeaderValue(key: string, value: string) {
  return key.toLowerCase() === 'content-security-policy'
    ? value.replace(PRODUCTION_API_ORIGIN, LOCAL_API_ORIGIN)
    : value
}
