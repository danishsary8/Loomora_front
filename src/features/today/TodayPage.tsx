import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { ErrorState, LoadingState } from '@/components/states'
import { FloatingAddButton, ProgressRing } from '@/components/ui'
import { SavePlanPrompt } from '@/features/auth/SavePlanPrompt'
import { StreakBadge, useStreak } from '@/features/streak'
import { nowAndNext, ScheduleItemSheet, useScheduleDay } from '@/features/schedule'
import { UndoDeleteToast } from '@/features/todos/UndoDeleteToast'
import { useUndoableDelete } from '@/features/todos/useUndoableDelete'
import { useSetTodoDone, useTodayTodos } from '@/features/todos/useTodos'
import { toLocalDate } from '@/lib/date'
import { useSession } from '@/lib/api'
import { formatInstantTime } from '@/lib/time/time'
import { AddTodoSheet, type TodoSheetTarget } from './AddTodoSheet'
import { DailyIntention } from './DailyIntention'
import { DaySheet } from './DaySheet'
import { NowNextStrip } from './NowNextStrip'
import { TodayEmpty } from './TodayEmpty'
import { TodoRow } from './TodoRow'
import { useNow } from './useNow'

/** S2/S3 Today, v1: guest to-dos only (F-006). */
export function TodayPage() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const [openedAt] = useState(() => now)
  const zone = useSession((state) => (state.token ? state.user?.timezone : undefined))
  const today = toLocalDate(openedAt, zone)
  const intentionDate = toLocalDate(now, zone)
  const [sheet, setSheet] = useState<{ open: boolean; target: TodoSheetTarget; instance: number }>({
    open: false,
    target: { type: 'create' },
    instance: 0,
  })
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false)
  const [daySheetOpen, setDaySheetOpen] = useState(false)
  const streak = useStreak(today).data
  const schedule = useScheduleDay(today).data ?? []
  const { now: nowItem, next: nextItem } = nowAndNext(
    schedule,
    formatInstantTime(now, '24h', 'en-GB', zone),
  )
  const todos = useTodayTodos(today)
  const setDone = useSetTodoDone(today)
  const del = useUndoableDelete({ date: today })

  const formatDate = useCallback(
    (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
      new Intl.DateTimeFormat(i18n.language, options).format(new Date(`${date}T00:00:00`)),
    [i18n.language],
  )

  const list = todos.data ?? []
  const doneCount = list.filter((todo) => todo.done_at !== null).length
  function openSheet(target: TodoSheetTarget) {
    setSheet(({ instance }) => ({ open: true, target, instance: instance + 1 }))
  }
  const addTodo = () => openSheet({ type: 'create' })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PageHeading>{t('pages.today.title')}</PageHeading>
          <p className="font-semibold text-muted">
            {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {streak && <StreakBadge {...streak} />}
      </header>

      <DailyIntention
        date={intentionDate}
        {...(intentionDate !== today && {
          dateHint: formatDate(intentionDate, { dateStyle: 'full' }),
        })}
      />

      {schedule.length > 0 && (
        <NowNextStrip now={nowItem} next={nextItem} onOpen={() => setDaySheetOpen(true)} />
      )}

      {todos.isPending ? (
        <LoadingState />
      ) : todos.isError ? (
        <ErrorState onRetry={() => void todos.refetch()} />
      ) : list.length === 0 ? (
        <TodayEmpty onAddTodo={addTodo} onAddSchedule={() => setScheduleSheetOpen(true)} />
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
                  onEdit={(target) => openSheet({ type: 'edit', todo: target })}
                  onAddSubtask={(parent) => openSheet({ type: 'subtask', parent })}
                  onDelete={(target) => void del.deleteTodo(target)}
                />
              ))}
            </ul>
            {setDone.isError && (
              <p role="alert" className="font-semibold text-danger">
                {t('today.saveError')}
              </p>
            )}
          </section>
          <FloatingAddButton onClick={addTodo} label={t('today.addTodo')} />
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
      <SavePlanPrompt today={today} />
      <AddTodoSheet
        key={sheet.instance}
        open={sheet.open}
        onClose={() =>
          setSheet((current) =>
            current.instance === sheet.instance ? { ...current, open: false } : current,
          )
        }
        today={today}
        target={sheet.target}
      />
      <UndoDeleteToast pending={del.pending} onUndo={() => void del.undo()} error={del.error} />
    </div>
  )
}
