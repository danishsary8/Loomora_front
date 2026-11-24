import { useState } from 'react'
import { useSession } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button, FloatingAddButton, SegmentedControl } from '@/components/ui'
import { formatWallTime, orderedWeekdays } from '@/lib/time/time'
import { useTimePreferences } from '@/lib/time/useTimePreferences'
import { DayToggle } from '../DayToggle'
import { ScheduleItemSheet, type ScheduleTarget } from '../ScheduleItemSheet'
import type { ScheduleItem, Weekday } from '../types'
import { UndoDeleteToast } from '../UndoDeleteToast'
import { useScheduleItems } from '../useSchedule'
import { useUndoableDelete } from '../useUndoableDelete'
import { CopyDaySheet } from './CopyDaySheet'
import { DayColumn } from './DayColumn'
import { useHorizontalOverflow } from './useHorizontalOverflow'
import { itemsOnWeekday, todayWeekday } from './weekPlan'

type WeekView = 'day' | 'week'

/** S6 Week: the fixed schedule. Phone: one day at a time or an overview; 768 px and up: 7 columns. */
export function WeekPage() {
  const generation = useSession((state) => state.generation)
  return <WeekSchedule key={generation} />
}

function WeekSchedule() {
  const { t, i18n } = useTranslation()
  const { values } = useTimePreferences()
  const weekdays = orderedWeekdays(values.week_starts_on)
  const formatTime = (time: string) => formatWallTime(time, values.time_format, i18n.language)
  const zone = useSession((state) => state.user?.timezone)
  const items = useScheduleItems()
  const del = useUndoableDelete()
  const today = todayWeekday(new Date(), zone)
  const [selected, setSelected] = useState<Weekday>(today)
  const [view, setView] = useState<WeekView>('day')
  const overview = view === 'week'
  const [target, setTarget] = useState<ScheduleTarget | null>(null)
  const [copyFrom, setCopyFrom] = useState<Weekday | null>(null)
  const [columns, setColumns] = useState<HTMLDivElement | null>(null)
  const scrollable = useHorizontalOverflow(columns)

  const list = (items.data ?? []).filter((item) => !del.isDeleting(item.id))
  const openAdd = () => setTarget({ type: 'create' })
  const openItem = (item: ScheduleItem) => setTarget({ type: 'item', item })

  return (
    <div className="flex flex-col gap-5">
      <header className="flex min-w-0 flex-col gap-0.5">
        <PageHeading>{t('pages.week.title')}</PageHeading>
        <p className="text-sm font-medium text-muted">{t('week.subtitle')}</p>
      </header>

      {items.isPending ? (
        <LoadingState />
      ) : items.isError ? (
        <ErrorState onRetry={() => void items.refetch()} />
      ) : list.length === 0 && !del.pending ? (
        <EmptyState
          title={t('week.emptyTitle')}
          message={t('week.emptyMessage')}
          actions={
            <Button size="lg" fullWidth onClick={openAdd}>
              {t('today.addToSchedule')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            <SegmentedControl
              label={t('week.viewMode')}
              options={[
                { value: 'day', label: t('week.singleDay') },
                { value: 'week', label: t('week.overview') },
              ]}
              value={view}
              onChange={setView}
            />
            <div
              role="group"
              aria-label={t('week.dayStrip')}
              className={
                overview
                  ? 'hidden'
                  : 'flex flex-wrap gap-1 rounded-lg border-hairline border-border-subtle bg-paper p-1 shadow-soft-sm'
              }
            >
              {weekdays.map((day) => (
                <DayToggle
                  key={day}
                  label={t(`weekdays.long.${day}`)}
                  text={t(`weekdays.short.${day}`)}
                  selected={day === selected}
                  current={day === today}
                  onClick={() => setSelected(day)}
                />
              ))}
            </div>
          </div>

          {/* pb-20: room to scroll the last item clear of the floating + */}
          <div className="pb-20">
            {/* 768 px and up: 7 readable columns that scroll inside this box when the screen is narrower. */}
            <div
              ref={setColumns}
              // Chromium leaves a partly visible control cut off at the scroller edge on Tab.
              onFocus={(event) => {
                if (scrollable && event.target !== event.currentTarget) {
                  event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                }
              }}
              {...(scrollable && {
                role: 'region',
                'aria-label': t('week.columns'),
                tabIndex: 0,
              })}
              className="flex flex-col gap-4 md:-mx-2 md:grid md:grid-cols-[repeat(7,minmax(8rem,1fr))] md:items-start md:gap-2 md:overflow-x-auto md:overscroll-x-contain md:scroll-px-2 md:px-2 md:pb-2 lg:gap-3"
            >
              {weekdays.map((day) => (
                <DayColumn
                  key={day}
                  day={day}
                  items={itemsOnWeekday(list, day)}
                  formatTime={formatTime}
                  isToday={day === today}
                  className={overview || day === selected ? undefined : 'hidden md:flex'}
                  onOpenItem={openItem}
                  onCopy={setCopyFrom}
                />
              ))}
            </div>
          </div>
          <FloatingAddButton onClick={openAdd} label={t('week.addItem')} />
        </>
      )}

      {target && (
        <ScheduleItemSheet
          open
          target={target}
          onClose={() => setTarget((current) => (current === target ? null : current))}
          onDelete={del.request}
        />
      )}
      <CopyDaySheet from={copyFrom} items={list} onClose={() => setCopyFrom(null)} />
      <UndoDeleteToast pending={del.pending} onUndo={del.undo} error={del.error} />
    </div>
  )
}
