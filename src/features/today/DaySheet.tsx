import { useTranslation } from 'react-i18next'
import { Card, Checkbox, Sheet } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Occurrence } from '@/features/schedule'
import type { LocalDate } from '@/features/todos/types'
import { useSetScheduleCheckin } from '@/features/schedule/useSchedule'

export interface DaySheetProps {
  open: boolean
  onClose: () => void
  date: LocalDate
  /** The day's occurrences in time order. */
  occurrences: readonly Occurrence[]
}

/** S5 Full day schedule: every item in time order, each can be checked off. */
export function DaySheet({ open, onClose, date, occurrences }: DaySheetProps) {
  const { t } = useTranslation()
  const setCheckin = useSetScheduleCheckin()
  return (
    <Sheet open={open} onClose={onClose} title={t('nowNext.daySheetTitle')}>
      <ul className="flex flex-col gap-3">
        {occurrences.map((o) => (
          <li key={o.schedule_item_id}>
            <Card tone={o.done ? 'paper' : o.category} compact className="py-1">
              <Checkbox
                checked={o.done}
                onChange={(e) =>
                  setCheckin.mutate({ id: o.schedule_item_id, date, done: e.target.checked })
                }
                aria-label={t('nowNext.markDone', { title: o.title })}
                className="w-full py-1"
                label={
                  <span className="flex min-w-0 flex-col">
                    <span className={cn('break-words font-semibold', o.done && 'line-through')}>
                      {o.title}
                    </span>
                    <span className="text-sm">
                      {t('nowNext.range', { start: o.start_time, end: o.end_time })}
                    </span>
                  </span>
                }
              />
            </Card>
          </li>
        ))}
      </ul>
      {setCheckin.isError && (
        <p role="alert" className="mt-3 font-semibold text-danger">
          {t('today.saveError')}
        </p>
      )}
    </Sheet>
  )
}
