import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ScheduleItem, Weekday } from '../types'

export interface DayColumnProps {
  day: Weekday
  items: readonly ScheduleItem[]
  className?: string
  onOpenItem: (item: ScheduleItem) => void
  onCopy: (day: Weekday) => void
}

/** One weekday of the fixed schedule: its items and the Copy day action. */
export function DayColumn({ day, items, className, onOpenItem, onCopy }: DayColumnProps) {
  const { t } = useTranslation()
  const name = t(`weekdays.long.${day}`)
  return (
    <section aria-label={name} className={cn('flex flex-col gap-3', className)}>
      <h2 className="font-script text-3xl font-bold md:text-2xl">{name}</h2>
      {items.length === 0 ? (
        <p className="text-muted">{t('week.nothingPlanned')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                aria-label={t('week.editItem', {
                  title: item.title,
                  start: item.start_time,
                  end: item.end_time,
                })}
                className="block w-full text-left"
              >
                <Card tone={item.category} className="p-3">
                  <span className="block text-sm font-semibold">
                    {t('week.timeRange', { start: item.start_time, end: item.end_time })}
                  </span>
                  <span className="block break-words font-bold">{item.title}</span>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <Button
          variant="secondary"
          aria-label={t('copyDay.open', { day: name })}
          onClick={() => onCopy(day)}
        >
          {t('copyDay.button')}
        </Button>
      )}
    </section>
  )
}
