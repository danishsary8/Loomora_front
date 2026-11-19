import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { streakKeys } from '@/features/streak/useStreak'
import { useTodoRepository } from '@/lib/storage'
import { changeTodayTodo } from './todayCache'
import type { CreateTodoInput, LocalDate, TodayTodo, UpdateTodoInput } from './types'

export const todoKeys = {
  all: ['todos'] as const,
  today: (date: LocalDate) => ['todos', 'today', date] as const,
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

/** Check off / un-check, shown at once (optimistic) and rolled back if saving fails. */
export function useSetTodoDone(date: LocalDate) {
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  const key = todoKeys.today(date)

  return useMutation({
    // A parent completion and a child toggle write the same state. Process them in order.
    scope: { id: 'todo-completion' },
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await queryClient.cancelQueries({ queryKey: key })
      let previousDoneAt: string | null | undefined
      queryClient.setQueryData<TodayTodo[]>(
        key,
        (list) =>
          list &&
          changeTodayTodo(list, id, (todo) => {
            previousDoneAt = todo.done_at
            return { ...todo, done_at: done ? new Date().toISOString() : null }
          }),
      )

      try {
        const saved = await repo.setDone(id, done)
        // Re-reading would immediately hide checked undated or overdue top-level rows.
        queryClient.setQueryData<TodayTodo[]>(
          key,
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
      } catch (error) {
        const doneAt = previousDoneAt
        if (doneAt !== undefined) {
          queryClient.setQueryData<TodayTodo[]>(
            key,
            (list) => list && changeTodayTodo(list, id, (todo) => ({ ...todo, done_at: doneAt })),
          )
        }
        throw error
      }
    },
  })
}
