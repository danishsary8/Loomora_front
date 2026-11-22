import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import 'fake-indexeddb/auto'
import '@/i18n'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './apiMocks'
import { useSavePlanIntent } from '@/features/auth/savePlanIntent'
import { useServiceStatus, useSession } from '@/lib/api'

// Cold lazy route imports on the Windows runner can outlast the default one-second query wait.
configure({ asyncUtilTimeout: 3000 })

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useSession.getState().signOut()
  useServiceStatus.getState().markUp()
  useSavePlanIntent.getState().clear()
  localStorage.clear()
})
afterAll(() => server.close())
