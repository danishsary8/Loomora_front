import { useTranslation } from 'react-i18next'
import { Button, Card, Checkbox, Sheet } from '@/components/ui'
import { PencilIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { Occurrence, ScheduleItem } from '@/features/schedule'
import type { LocalDate } from '@/features/todos/types'
import { useClockDisplay } from '@/lib/time/useTimePreferences'
import { useScheduleItems, useSetScheduleCheckin } from '@/features/schedule/useSchedule'

export interface DaySheetProps {
  open: boolean
  onClose: () => void
  date: LocalDate
  /** The day's occurrences in time order. */
  occurrences: readonly Occurrence[]
  onEdit: (item: ScheduleItem, occurrence: Occurrence) => void
}

/** S5 Full day schedule: every item in time order, each can be checked off. */
export function DaySheet({ open, onClose, date, occurrences, onEdit }: DaySheetProps) {
  const { t } = useTranslation()
  const setCheckin = useSetScheduleCheckin()
  const { data: items } = useScheduleItems(open)
  const { wall } = useClockDisplay()
  return (
    <Sheet open={open} onClose={onClose} title={t('nowNext.daySheetTitle')}>
      <ul className="flex flex-col gap-3">
        {occurrences.map((o) => {
          const item = items?.find(({ id }) => id === o.schedule_item_id)
          const time = { start: wall(o.start_time), end: wall(o.end_time) }
          return (
            <li key={o.schedule_item_id}>
              <Card
                tone={o.done ? 'paper' : o.category}
                compact
                className="flex items-center gap-2 py-1"
              >
                <Checkbox
                  checked={o.done}
                  onChange={(e) =>
                    setCheckin.mutate({ id: o.schedule_item_id, date, done: e.target.checked })
                  }
                  aria-label={t('nowNext.markDone', { title: o.title })}
                  className="min-w-0 flex-1 py-1 [&>span:last-child]:min-w-0"
                  label={
                    <span className="flex min-w-0 flex-col">
                      <span className={cn('break-words font-semibold', o.done && 'line-through')}>
                        {o.title}
                      </span>
                      <span className="text-sm">{t('nowNext.range', time)}</span>
                    </span>
                  }
                />
                {item && (
                  <Button
                    variant="secondary"
                    className="size-11 shrink-0 !px-0"
                    aria-label={t('week.editItem', { title: o.title, ...time })}
                    onClick={() => onEdit(item, o)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
      {setCheckin.isError && (
        <p role="alert" className="mt-3 font-semibold text-danger">
          {t('today.saveError')}
        </p>
      )}
    </Sheet>
  )
}
