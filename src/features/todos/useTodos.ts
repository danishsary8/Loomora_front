import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTodoRepository } from '@/lib/storage'
import type { CreateTodoInput, LocalDate, TodayTodo } from './types'

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

/** Check off / un-check, shown at once (optimistic) and rolled back if saving fails. */
export function useSetTodoDone(date: LocalDate) {
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  const key = todoKeys.today(date)

  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => repo.setDone(id, done),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TodayTodo[]>(key)
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        list?.map((t) =>
          t.id === id ? { ...t, done_at: done ? new Date().toISOString() : null } : t,
        ),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    // Keep the checked row on screen until the next load: re-reading now would drop an
    // undated to-do the moment it is checked (docs/08 rule 1; see Q3 in docs/PROGRESS.md).
    onSuccess: (saved) => {
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        list?.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)),
      )
    },
  })
}
