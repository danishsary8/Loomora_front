import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useScheduleRepository } from '@/lib/storage'
import { scheduleKeys } from '../useSchedule'
import type { ScheduleItem, Weekday } from '../types'
import { copyDayChanges } from './weekPlan'

/** The repeat definitions the Week screen shows. */
export function useScheduleItems() {
  const repo = useScheduleRepository()
  return useQuery({ queryKey: scheduleKeys.items, queryFn: () => repo.listItems() })
}

/** "Copy day to...": the items on `from` also repeat on the `to` days. */
export function useCopyDay(items: readonly ScheduleItem[]) {
  const repo = useScheduleRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ from, to }: { from: Weekday; to: Weekday[] }) => {
      await Promise.all(
        copyDayChanges(items, from, to).map(({ id, days }) => repo.update(id, { days })),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all }),
  })
}
