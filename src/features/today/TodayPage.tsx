import { format } from 'date-fns'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { ErrorState, LoadingState } from '@/components/states'
import { FloatingAddButton, ProgressRing } from '@/components/ui'
import { nowAndNext, ScheduleItemSheet, useScheduleDay } from '@/features/schedule'
import { useSetTodoDone, useTodayTodos } from '@/features/todos/useTodos'
import { toLocalDate } from '@/lib/date'
import { AddTodoSheet } from './AddTodoSheet'
import { DaySheet } from './DaySheet'
import { NowNextStrip } from './NowNextStrip'
import { TodayEmpty } from './TodayEmpty'
import { TodoRow } from './TodoRow'
import { useNow } from './useNow'

/** S2/S3 Today, v1: guest to-dos only (F-006). */
export function TodayPage() {
  const { t, i18n } = useTranslation()
  const [today] = useState(() => toLocalDate())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false)
  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const now = useNow()
  const schedule = useScheduleDay(today).data ?? []
  const { now: nowItem, next: nextItem } = nowAndNext(schedule, format(now, 'HH:mm'))
  const todos = useTodayTodos(today)
  const setDone = useSetTodoDone(today)

  const formatDate = useCallback(
    (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
      new Intl.DateTimeFormat(i18n.language, options).format(new Date(`${date}T00:00:00`)),
    [i18n.language],
  )

  const list = todos.data ?? []
  const doneCount = list.filter((todo) => todo.done_at !== null).length
  const openSheet = () => setSheetOpen(true)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <PageHeading>{t('pages.today.title')}</PageHeading>
        <p className="font-semibold text-muted">
          {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {schedule.length > 0 && (
        <NowNextStrip now={nowItem} next={nextItem} onOpen={() => setDaySheetOpen(true)} />
      )}

      {todos.isPending ? (
        <LoadingState />
      ) : todos.isError ? (
        <ErrorState onRetry={() => void todos.refetch()} />
      ) : list.length === 0 ? (
        <TodayEmpty onAddTodo={openSheet} onAddSchedule={() => setScheduleSheetOpen(true)} />
      ) : (
        <>
          <div className="flex justify-center">
            <ProgressRing
              value={doneCount}
              max={list.length}
              label={t('progress.doneOfTotal', { done: doneCount, total: list.length })}
            />
          </div>
          {/* pb-20: room to scroll the last row clear of the floating + */}
          <section aria-labelledby="todo-list-heading" className="flex flex-col gap-3 pb-20">
            <h2 id="todo-list-heading" className="sr-only">
              {t('today.list')}
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  formatDate={formatDate}
                  onToggle={(id, done) => setDone.mutate({ id, done })}
                />
              ))}
            </ul>
            {setDone.isError && (
              <p role="alert" className="font-semibold text-danger">
                {t('today.saveError')}
              </p>
            )}
          </section>
          <FloatingAddButton onClick={openSheet} label={t('today.addTodo')} />
        </>
      )}

      <DaySheet
        open={daySheetOpen}
        onClose={() => setDaySheetOpen(false)}
        date={today}
        occurrences={schedule}
      />
      <ScheduleItemSheet
        open={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        target={{ type: 'create' }}
      />
      <AddTodoSheet open={sheetOpen} onClose={() => setSheetOpen(false)} today={today} />
    </div>
  )
}
