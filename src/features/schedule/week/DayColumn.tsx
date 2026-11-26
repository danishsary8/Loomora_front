import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { CATEGORY_ICONS } from '@/components/ui/categoryIcons'
import { cn } from '@/lib/cn'
import type { ScheduleItem, Weekday } from '../types'

export interface DayColumnProps {
  day: Weekday
  items: readonly ScheduleItem[]
  formatTime: (time: string) => string
  /** Today's weekday gets a soft tint and a "Today" pill. */
  isToday?: boolean
  /** Phone single-day mode renders a left time gutter + "+ Add block" header pill. */
  singleDay?: boolean
  className?: string
  onOpenItem: (item: ScheduleItem) => void
  onCopy: (day: Weekday) => void
  onAddItem?: () => void
}

/** One weekday of the fixed schedule: its items and the Copy day action. */
export function DayColumn({
  day,
  items,
  formatTime,
  isToday = false,
  singleDay = false,
  className,
  onOpenItem,
  onCopy,
  onAddItem,
}: DayColumnProps) {
  const { t } = useTranslation()
  const name = t(`weekdays.long.${day}`)
  return (
    <section
      aria-label={name}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-lg border-hairline p-3 md:p-2.5',
        isToday ? 'border-primary/25 bg-primary-soft/60' : 'border-border-subtle bg-paper/60',
        singleDay && 'border-0 bg-transparent p-0 md:border-hairline md:p-2.5',
        singleDay &&
          (isToday
            ? 'md:border-primary/25 md:bg-primary-soft/60'
            : 'md:border-border-subtle md:bg-paper/60'),
        className,
      )}
    >
      <DayHeader
        name={name}
        count={items.length}
        isToday={isToday}
        singleDay={singleDay}
        onAddItem={onAddItem}
      />
      {items.length === 0 ? (
        <p className="rounded-md border-hairline border-dashed border-border-control/40 px-3 py-4 text-center text-sm text-muted md:px-2">
          {t('week.nothingPlanned')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.id} className={cn(singleDay && 'flex items-start gap-2.5 md:block')}>
              {singleDay && (
                <span
                  aria-hidden="true"
                  className="w-12 shrink-0 pt-2.5 text-xs font-medium tabular-nums text-muted md:hidden"
                >
                  {formatTime(item.start_time)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <ItemCard item={item} formatTime={formatTime} onOpen={onOpenItem} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <Button
          variant="ghost"
          fullWidth
          className="border-hairline border-transparent text-xs font-medium text-muted hover:border-border-subtle hover:text-ink md:px-3"
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
  count: number
  isToday: boolean
  singleDay: boolean
  onAddItem?: () => void
}

function DayHeader({ name, count, isToday, singleDay, onAddItem }: DayHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="min-w-0 truncate text-xl font-semibold tracking-tight text-ink md:text-lg">
          {singleDay ? (
            <>
              <span className="md:hidden">{t('week.dayRhythm', { day: name })}</span>
              <span className="hidden md:inline">{name}</span>
            </>
          ) : (
            name
          )}
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
      {singleDay && onAddItem && (
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex min-h-touch items-center gap-1 rounded-full border-hairline border-primary/20 bg-primary-soft px-3.5 text-xs font-semibold text-primary shadow-soft-sm transition-colors duration-fast ease-elemental hover:bg-primary/15 md:hidden"
        >
          <span aria-hidden="true">+</span>
          <span>{t('week.addBlock')}</span>
        </button>
      )}
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
  const Icon = CATEGORY_ICONS[item.category]
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
        className="flex min-h-touch items-start gap-3 transition-shadow duration-fast ease-elemental group-hover:shadow-soft-md md:p-2.5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-paper/75 text-ink shadow-soft-sm md:hidden">
          <Icon className="h-icon-md w-icon-md" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="block hyphens-auto break-words text-sm font-semibold leading-snug">
            {item.title}
          </span>{' '}
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-ink/80">
            <span className="tabular-nums">{t('week.timeRange', times)}</span>
            <span aria-hidden="true">·</span>
            <span>{category}</span>
          </span>
        </span>
      </Card>
    </button>
  )
}
