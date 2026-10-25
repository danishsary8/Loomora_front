import { useQuery } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { useScheduleRepository, useTodoRepository } from '@/lib/storage'
import { computeStreak, type Streak } from './streak'

export const streakKeys = { all: ['streak'] as const }

/** The current streak, computed on this device from the guest data. */
export function useStreak(today: LocalDate) {
  const todos = useTodoRepository()
  const schedule = useScheduleRepository()
  return useQuery<Streak>({
    queryKey: [...streakKeys.all, today],
    queryFn: async () => {
      const [allTodos, items, exceptions, checkins] = await Promise.all([
        todos.listAll(),
        schedule.listItems(),
        schedule.listExceptions(),
        schedule.listCheckins(),
      ])
      return computeStreak({
        todos: allTodos,
        items,
        exceptions,
        checkins,
        today,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    },
  })
}
