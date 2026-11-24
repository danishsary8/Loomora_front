import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { streakKeys } from '@/features/streak/useStreak'
import { useSession } from '@/lib/api'
import { GuestTodoRepository, useTodoRepository } from '@/lib/storage'
import { changeTodayTodo } from './todayCache'
import type { CreateTodoInput, LocalDate, TodayTodo, UpdateTodoInput } from './types'

export const todoKeys = {
  all: ['todos'] as const,
  lists: ['todos', 'today'] as const,
  due: ['todos', 'reminders'] as const,
  reminders: (accountId: string | null, generation = 0) =>
    [...todoKeys.due, accountId, generation] as const,
  sessionLists: (generation: number) => [...todoKeys.lists, generation] as const,
  today: (date: LocalDate, generation: number) =>
    [...todoKeys.sessionLists(generation), date] as const,
}

function useTodoStorage() {
  const repo = useTodoRepository()
  const generation = useSession((state) => state.generation)
  const networkMode = repo instanceof GuestTodoRepository ? 'always' : 'online'
  const sameSession = () => useSession.getState().generation === generation
  const assertSession = () => {
    if (!sameSession()) throw new Error('Session changed')
  }
  return { repo, generation, networkMode, sameSession, assertSession } as const
}

export function useTodayTodos(date: LocalDate, enabled = true) {
  const { repo, generation, networkMode, assertSession } = useTodoStorage()
  return useQuery({
    queryKey: todoKeys.today(date, generation),
    networkMode,
    enabled,
    queryFn: () => {
      assertSession()
      return repo.listForDate(date)
    },
  })
}

export function useCreateTodo() {
  const { repo, generation, networkMode, sameSession, assertSession } = useTodoStorage()
  const queryClient = useQueryClient()
  return useMutation({
    // A changed key detaches the observer before it can replace a paused mutation's options.
    mutationKey: [...todoKeys.all, 'create', generation],
    networkMode,
    mutationFn: (input: CreateTodoInput) => {
      assertSession()
      return repo.create(input)
    },
    onSuccess: () => {
      if (sameSession()) return queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
  })
}

export function useUpdateTodo() {
  const { repo, generation, networkMode, sameSession, assertSession } = useTodoStorage()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: [...todoKeys.all, 'update', generation],
    networkMode,
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTodoInput }) => {
      assertSession()
      return repo.update(id, patch)
    },
    onSuccess: () => {
      if (sameSession()) return queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
  })
}

interface SetDoneInput {
  id: string
  done: boolean
  /** Set for a reminder action so a queued completion cannot cross sessions. */
  sessionToken?: string | null
}

/** Check off / un-check, shown at once (optimistic) and rolled back if saving fails. */
export function useSetTodoDone(date: LocalDate | undefined, networkModeOverride?: 'always') {
  const { repo, generation, networkMode, sameSession } = useTodoStorage()
  const queryClient = useQueryClient()
  const filters = date
    ? { queryKey: todoKeys.today(date, generation), exact: true }
    : { queryKey: todoKeys.sessionLists(generation) }

  return useMutation({
    mutationKey: [...todoKeys.all, 'completion', generation],
    // A parent completion and a child toggle write the same state. Process them in order.
    scope: { id: `todo-completion:${generation}` },
    networkMode: networkModeOverride ?? networkMode,
    mutationFn: async ({ id, done, sessionToken }: SetDoneInput) => {
      const canComplete = () =>
        sameSession() &&
        (sessionToken === undefined || useSession.getState().token === sessionToken)
      if (!canComplete()) return
      await queryClient.cancelQueries(filters)
      if (!canComplete()) return

      const stamp = done ? new Date().toISOString() : null
      const previous = queryClient.getQueriesData<TodayTodo[]>(filters).map(([key]) => {
        let doneAt: string | null | undefined
        queryClient.setQueryData<TodayTodo[]>(
          key,
          (list) =>
            list &&
            changeTodayTodo(list, id, (todo) => {
              doneAt = todo.done_at
              return { ...todo, done_at: stamp }
            }),
        )
        return { key, doneAt }
      })

      try {
        const saved = await repo.setDone(id, done)
        if (!canComplete()) return
        // Re-reading would immediately hide checked undated or overdue top-level rows.
        queryClient.setQueriesData<TodayTodo[]>(
          filters,
          (list) =>
            list &&
            changeTodayTodo(list, id, (todo) => ({
              ...todo,
              done_at: saved.done_at,
              repeat_rule: saved.repeat_rule,
              next_todo_id: saved.next_todo_id,
              subtasks: todo.subtasks.map((child) => {
                const updated = saved.subtasks?.find((row) => row.id === child.id)
                return updated ? { ...child, done_at: updated.done_at } : child
              }),
            })),
        )
        void queryClient.invalidateQueries({ queryKey: streakKeys.all })
        void queryClient.invalidateQueries({ queryKey: todoKeys.due })
      } catch (error) {
        if (canComplete()) {
          for (const { key, doneAt } of previous) {
            if (doneAt === undefined) continue
            queryClient.setQueryData<TodayTodo[]>(
              key,
              (list) => list && changeTodayTodo(list, id, (todo) => ({ ...todo, done_at: doneAt })),
            )
          }
        }
        throw error
      }
    },
  })
}
