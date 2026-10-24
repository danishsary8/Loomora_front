import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button, FloatingAddButton } from '@/components/ui'
import { DayToggle } from '../DayToggle'
import { ScheduleItemSheet, type ScheduleTarget } from '../ScheduleItemSheet'
import type { ScheduleItem, Weekday } from '../types'
import { UndoDeleteToast } from '../UndoDeleteToast'
import { useUndoableDelete } from '../useUndoableDelete'
import { CopyDaySheet } from './CopyDaySheet'
import { DayColumn } from './DayColumn'
import { useScheduleItems } from './useWeek'
import { itemsOnWeekday, todayWeekday, WEEKDAYS } from './weekPlan'

/** S6 Week: the fixed schedule. Phone: one day at a time or an overview; 768 px and up: 7 columns. */
export function WeekPage() {
  const { t } = useTranslation()
  const items = useScheduleItems()
  const del = useUndoableDelete()
  const [selected, setSelected] = useState<Weekday>(() => todayWeekday())
  const [overview, setOverview] = useState(false)
  const [target, setTarget] = useState<ScheduleTarget | null>(null)
  const [copyFrom, setCopyFrom] = useState<Weekday | null>(null)

  // The item waiting for its undo window is hidden, as the delete hook asks.
  const list = (items.data ?? []).filter((item) => item.id !== del.pending?.item.id)
  const openAdd = () => setTarget({ type: 'create' })
  const openItem = (item: ScheduleItem) => setTarget({ type: 'item', item })

  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.week.title')}</PageHeading>

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
            <div
              role="group"
              aria-label={t('week.dayStrip')}
              className={overview ? 'hidden' : 'flex gap-2'}
            >
              {WEEKDAYS.map((day) => (
                <DayToggle
                  key={day}
                  label={t(`weekdays.long.${day}`)}
                  text={t(`weekdays.short.${day}`)}
                  selected={day === selected}
                  onClick={() => setSelected(day)}
                />
              ))}
            </div>
            <Button
              variant="secondary"
              aria-pressed={overview}
              onClick={() => setOverview(!overview)}
            >
              {t(overview ? 'week.singleDay' : 'week.overview')}
            </Button>
          </div>

          {/* pb-20: room to scroll the last item clear of the floating + */}
          <div className="flex flex-col gap-6 pb-20 md:grid md:grid-cols-7 md:items-start md:gap-3">
            {WEEKDAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                items={itemsOnWeekday(list, day)}
                className={overview || day === selected ? undefined : 'hidden md:flex'}
                onOpenItem={openItem}
                onCopy={setCopyFrom}
              />
            ))}
          </div>
          <FloatingAddButton onClick={openAdd} label={t('week.addItem')} />
        </>
      )}

      {target && (
        <ScheduleItemSheet
          open
          target={target}
          onClose={() => setTarget(null)}
          onDelete={(request) => void del.request(request)}
        />
      )}
      <CopyDaySheet from={copyFrom} items={list} onClose={() => setCopyFrom(null)} />
      <UndoDeleteToast pending={del.pending} onUndo={del.undo} />
    </div>
  )
}
