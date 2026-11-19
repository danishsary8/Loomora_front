import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { streakKeys } from '@/features/streak/useStreak'
import { useSession } from '@/lib/api'
import { useTodoRepository } from '@/lib/storage'
import { changeTodayTodo } from './todayCache'
import type { CreateTodoInput, LocalDate, TodayTodo, UpdateTodoInput } from './types'

export const todoKeys = {
  all: ['todos'] as const,
  lists: ['todos', 'today'] as const,
  due: ['todos', 'reminders'] as const,
  reminders: (accountId: string | null) => [...todoKeys.due, accountId] as const,
  today: (date: LocalDate) => [...todoKeys.lists, date] as const,
}

export function useTodayTodos(date: LocalDate) {
  const repo = useTodoRepository()
  return useQuery({
    queryKey: todoKeys.today(date),
    queryFn: () => repo.listForDate(date),
  })
}

export function useCreateTodo() {
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTodoInput) => repo.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useUpdateTodo() {
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTodoInput }) => repo.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

interface SetDoneInput {
  id: string
  done: boolean
  /** Set for a reminder action so a queued completion cannot cross sessions. */
  sessionToken?: string | null
}

/** Check off / un-check, shown at once (optimistic) and rolled back if saving fails. */
export function useSetTodoDone(date: LocalDate | undefined, networkMode?: 'always') {
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  const filters = date
    ? { queryKey: todoKeys.today(date), exact: true }
    : { queryKey: todoKeys.lists }

  return useMutation({
    // A parent completion and a child toggle write the same state. Process them in order.
    scope: { id: 'todo-completion' },
    networkMode,
    mutationFn: async ({ id, done, sessionToken }: SetDoneInput) => {
      const sameSession = () =>
        sessionToken === undefined || useSession.getState().token === sessionToken
      if (!sameSession()) return
      await queryClient.cancelQueries(filters)
      if (!sameSession()) return

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
        if (!sameSession()) return
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
        if (sameSession()) {
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
