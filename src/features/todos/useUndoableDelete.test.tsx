import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { useSession } from '@/lib/api'
import { GuestDatabase } from '@/lib/storage/db'
import { GuestTodoRepository } from '@/lib/storage/GuestTodoRepository'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import type { TodayTodo } from './types'
import { todoKeys } from './useTodos'
import { useUndoableDelete } from './useUndoableDelete'

const DATE = '2026-10-24'
const UUID_1 = '11111111-1111-4111-8111-111111111111'
const UUID_2 = '22222222-2222-4222-8222-222222222222'

const sampleTodo1: TodayTodo = {
  id: UUID_1,
  title: 'First task',
  category: 'study',
  due_date: DATE,
  done_at: null,
  overdue: false,
  old: false,
  created_at: '2026-10-24T08:00:00.000Z',
  updated_at: '2026-10-24T08:00:00.000Z',
}

const sampleTodo2: TodayTodo = {
  id: UUID_2,
  title: 'Second task',
  category: 'work',
  due_date: DATE,
  done_at: null,
  overdue: false,
  old: false,
  created_at: '2026-10-24T08:01:00.000Z',
  updated_at: '2026-10-24T08:01:00.000Z',
}

describe('useUndoableDelete', () => {
  afterEach(() => {
    vi.useRealTimers()
    useSession.getState().signOut()
  })

  describe('guest mode', () => {
    let db: GuestDatabase
    let repo: GuestTodoRepository
    let queryClient: ReturnType<typeof createQueryClient>

    beforeEach(async () => {
      useSession.getState().signOut()
      db = new GuestDatabase(`test-${crypto.randomUUID()}`)
      repo = new GuestTodoRepository({ db })
      queryClient = createQueryClient()
      await db.todos.bulkAdd([sampleTodo1, sampleTodo2])
      queryClient.setQueryData(todoKeys.today(DATE), [sampleTodo1, sampleTodo2])
    })

    afterEach(async () => {
      await db.delete()
    })

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <AppProviders todoRepository={repo} queryClient={queryClient}>
          {children}
        </AppProviders>
      )
    }

    it('immediately removes item from cache, soft-deletes in repo, and restores at original index on undo', async () => {
      const { result } = renderHook(() => useUndoableDelete({ date: DATE }), { wrapper })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      // Immediately removed from query cache
      const cachedAfterDelete = queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))
      expect(cachedAfterDelete?.map((t) => t.id)).toEqual([UUID_2])
      expect(result.current.pending?.id).toBe(UUID_1)

      // Verified soft-deleted in Dexie
      const inDb = await db.todos.get(UUID_1)
      expect(inDb?.deleted_at).toBeTruthy()

      // Undo restores the item at its original position
      await act(async () => {
        await result.current.undo()
      })

      const cachedAfterUndo = queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))
      expect(cachedAfterUndo?.map((t) => t.id)).toEqual([UUID_1, UUID_2])
      expect(result.current.pending).toBeNull()

      const restoredInDb = await db.todos.get(UUID_1)
      expect(restoredInDb?.deleted_at).toBeNull()
    })

    it('persists delete when timeout elapses without undo', async () => {
      const { result } = renderHook(() => useUndoableDelete({ date: DATE, delayMs: 50 }), {
        wrapper,
      })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      expect(result.current.pending?.id).toBe(UUID_1)

      await waitFor(
        () => {
          expect(result.current.pending).toBeNull()
        },
        { timeout: 1000 },
      )

      const inDb = await db.todos.get(UUID_1)
      expect(inDb?.deleted_at).toBeTruthy()
    })

    it('rolls back cache and displays error when repository delete fails', async () => {
      const failingRepo = new GuestTodoRepository({ db })
      vi.spyOn(failingRepo, 'delete').mockRejectedValueOnce(new Error('IndexedDB failure'))

      const { result } = renderHook(() => useUndoableDelete({ date: DATE }), {
        wrapper: ({ children }) => (
          <AppProviders todoRepository={failingRepo} queryClient={queryClient}>
            {children}
          </AppProviders>
        ),
      })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      // Cache rolled back to original 2 items
      const cached = queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))
      expect(cached?.map((t) => t.id)).toEqual([UUID_1, UUID_2])
      expect(result.current.pending).toBeNull()
      expect(result.current.error).toBe('Could not delete. Please try again.')
    })
  })

  describe('account mode (server API)', () => {
    let queryClient: ReturnType<typeof createQueryClient>

    beforeEach(() => {
      useSession.getState().signIn(makeTokenResponse())
      queryClient = createQueryClient()
      queryClient.setQueryData(todoKeys.today(DATE), [sampleTodo1, sampleTodo2])
    })

    afterEach(() => {
      useSession.getState().signOut()
    })

    function wrapper({ children }: { children: ReactNode }) {
      return <AppProviders queryClient={queryClient}>{children}</AppProviders>
    }

    it('sends DELETE /todos/:id and POST /todos/:id/restore on undo', async () => {
      const calls: string[] = []
      server.use(
        http.delete(`${API}/todos/${UUID_1}`, () => {
          calls.push('DELETE')
          return new HttpResponse(null, { status: 204 })
        }),
        http.post(`${API}/todos/${UUID_1}/restore`, () => {
          calls.push('RESTORE')
          return HttpResponse.json({
            data: {
              ...sampleTodo1,
              created_at: sampleTodo1.created_at,
            },
          })
        }),
      )

      const { result } = renderHook(() => useUndoableDelete({ date: DATE }), { wrapper })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      expect(calls).toEqual(['DELETE'])
      expect(queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))?.map((t) => t.id)).toEqual([
        UUID_2,
      ])

      await act(async () => {
        await result.current.undo()
      })

      expect(calls).toEqual(['DELETE', 'RESTORE'])
      expect(queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))?.map((t) => t.id)).toEqual([
        UUID_1,
        UUID_2,
      ])
    })

    it('persists delete when timeout elapses without undo', async () => {
      const calls: string[] = []
      server.use(
        http.delete(`${API}/todos/${UUID_1}`, () => {
          calls.push('DELETE')
          return new HttpResponse(null, { status: 204 })
        }),
        http.post(`${API}/todos/${UUID_1}/restore`, () => {
          calls.push('RESTORE')
          return HttpResponse.json({ data: sampleTodo1 })
        }),
      )

      const { result } = renderHook(() => useUndoableDelete({ date: DATE, delayMs: 50 }), {
        wrapper,
      })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      expect(calls).toEqual(['DELETE'])
      expect(result.current.pending?.id).toBe(UUID_1)

      await waitFor(
        () => {
          expect(result.current.pending).toBeNull()
        },
        { timeout: 1000 },
      )

      expect(calls).toEqual(['DELETE'])
    })

    it('rolls back cache on server DELETE failure (500)', async () => {
      server.use(
        http.delete(`${API}/todos/${UUID_1}`, () => {
          return HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 })
        }),
      )

      const { result } = renderHook(() => useUndoableDelete({ date: DATE }), { wrapper })

      await act(async () => {
        await result.current.deleteTodo(sampleTodo1)
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Could not delete. Please try again.')
      })
      expect(queryClient.getQueryData<TodayTodo[]>(todoKeys.today(DATE))?.map((t) => t.id)).toEqual([
        UUID_1,
        UUID_2,
      ])
      expect(result.current.pending).toBeNull()
    })
  })
})
