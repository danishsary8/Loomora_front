import { useScheduleMutation } from '../useSchedule'
import type { ScheduleItem, Weekday } from '../types'
import { copyDayChanges } from './weekPlan'

/** "Copy day to...": the items on `from` also repeat on the `to` days. */
export function useCopyDay(items: readonly ScheduleItem[]) {
  return useScheduleMutation(
    'copy-day',
    async (repo, { from, to }: { from: Weekday; to: Weekday[] }) => {
      const results = await Promise.allSettled(
        copyDayChanges(items, from, to).map(({ id, days }) => repo.update(id, { days })),
      )
      const failed = results.find((result) => result.status === 'rejected')
      if (failed) throw failed.reason
    },
    { refreshOnError: true },
  )
}
