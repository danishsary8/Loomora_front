import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { routes } from '@/app/routes'
import { GuestDatabase, GuestTodoRepository, type TodoRepository } from '@/lib/storage'

/** A guest repository on its own throwaway IndexedDB (fake-indexeddb in tests). */
export function createTestRepository(options: { now?: () => Date } = {}) {
  const db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  return { db, repo: new GuestTodoRepository({ db, ...options }) }
}

/** Render the real route table at a path, with fresh providers. */
export function renderRoute(path: string, todoRepository?: TodoRepository) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const repo = todoRepository ?? createTestRepository().repo
  return {
    router,
    ...render(
      <AppProviders todoRepository={repo} queryClient={createQueryClient()}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  }
}
