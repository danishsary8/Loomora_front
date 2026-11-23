import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ScheduleItem, Weekday } from '../types'

export interface DayColumnProps {
  day: Weekday
  items: readonly ScheduleItem[]
  formatTime: (time: string) => string
  /** Today's weekday gets a soft tint and a "Today" pill. */
  isToday?: boolean
  className?: string
  onOpenItem: (item: ScheduleItem) => void
  onCopy: (day: Weekday) => void
}

/** One weekday of the fixed schedule: its items and the Copy day action. */
export function DayColumn({
  day,
  items,
  formatTime,
  isToday = false,
  className,
  onOpenItem,
  onCopy,
}: DayColumnProps) {
  const { t } = useTranslation()
  const name = t(`weekdays.long.${day}`)
  return (
    <section
      aria-label={name}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        // The 768 px columns are too narrow for panel chrome; panels return at 1024 px.
        'flex min-w-0 flex-col gap-3 rounded-lg border-hairline p-3 md:border-transparent md:bg-transparent md:p-0 lg:p-3',
        isToday
          ? 'border-primary/25 bg-primary-soft/60 lg:border-primary/25 lg:bg-primary-soft/60'
          : 'border-border-subtle bg-paper/60 lg:border-border-subtle lg:bg-paper/60',
        className,
      )}
    >
      <DayHeader
        name={name}
        short={t(`weekdays.short.${day}`)}
        count={items.length}
        isToday={isToday}
      />
      {items.length === 0 ? (
        <p className="rounded-md border-hairline border-dashed border-border-control/40 px-3 py-4 text-center text-sm text-muted md:px-1">
          {t('week.nothingPlanned')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} formatTime={formatTime} onOpen={onOpenItem} />
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <Button
          variant="secondary"
          fullWidth
          className="md:px-2 lg:px-5"
          aria-label={t('copyDay.open', { day: name })}
          onClick={() => onCopy(day)}
        >
          {t('copyDay.button')}
        </Button>
      )}
    </section>
  )
}

interface DayHeaderProps {
  name: string
  short: string
  count: number
  isToday: boolean
}

// Full weekday names on phone and wide screens; short names in the narrow 768 px columns.
function DayHeader({ name, short, count, isToday }: DayHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight text-ink md:text-base lg:text-lg">
        <span className="md:hidden lg:inline">{name}</span>
        <span className="hidden md:inline lg:hidden">{short}</span>
      </h2>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-xs font-medium leading-4 tabular-nums text-muted">
          {t('week.itemCount', { count })}
        </p>
        {isToday && (
          <span className="rounded-full bg-primary px-2 text-xs font-semibold leading-4 text-white">
            {t('week.today')}
          </span>
        )}
      </div>
    </div>
  )
}

interface ItemCardProps {
  item: ScheduleItem
  formatTime: (time: string) => string
  onOpen: (item: ScheduleItem) => void
}

function ItemCard({ item, formatTime, onOpen }: ItemCardProps) {
  const { t } = useTranslation()
  const times = { start: formatTime(item.start_time), end: formatTime(item.end_time) }
  const category = t(`categories.${item.category}`)
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={t('week.editItemWithCategory', { title: item.title, ...times, category })}
      className="group block w-full min-w-0 rounded-md text-left transition-transform duration-fast ease-elemental active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Card
        tone={item.category}
        compact
        className="flex min-h-touch flex-col-reverse gap-1 transition-shadow duration-fast ease-elemental group-hover:shadow-soft-md md:p-1.5 lg:p-3"
      >
        <span className="block hyphens-auto break-words text-sm font-semibold leading-snug md:text-xs lg:text-sm">
          {item.title}
        </span>{' '}
        <span className="flex flex-wrap items-center justify-between gap-x-2 text-xs font-medium text-ink">
          <span className="tabular-nums">{t('week.timeRange', times)}</span> <span>{category}</span>
        </span>
      </Card>
    </button>
  )
}
