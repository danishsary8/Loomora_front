import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import '@/i18n'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './apiMocks'
import { useSession } from '@/lib/api'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useSession.getState().signOut()
})
afterAll(() => server.close())
