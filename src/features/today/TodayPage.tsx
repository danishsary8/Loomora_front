import { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppPageHeader } from '@/components/page'
import { ErrorState, LoadingState } from '@/components/states'
import { FloatingAddButton } from '@/components/ui'
import { SavePlanPrompt } from '@/features/auth/SavePlanPrompt'
import { StreakBadge, useStreak } from '@/features/streak'
import { nowAndNext, useScheduleDay } from '@/features/schedule'
import type { ScheduleTarget } from '@/features/schedule/ScheduleItemSheet'
import { UndoDeleteToast as ScheduleUndoToast } from '@/features/schedule/UndoDeleteToast'
import { useUndoableDelete as useScheduleDelete } from '@/features/schedule/useUndoableDelete'
import { UndoDeleteToast } from '@/features/todos/UndoDeleteToast'
import { useUndoableDelete } from '@/features/todos/useUndoableDelete'
import { useSetTodoDone, useTodayTodos } from '@/features/todos/useTodos'
import { toLocalDate } from '@/lib/date'
import { useSession } from '@/lib/api'
import { formatInstantTime } from '@/lib/time/time'
import type { TodoSheetTarget } from './AddTodoSheet'
import { DailyIntention } from './DailyIntention'
import { NowNextStrip } from './NowNextStrip'
import { TodayEmpty } from './TodayEmpty'
import { TodayProgressCard } from './TodayProgressCard'
import { TodoRow } from './TodoRow'
import { useNow } from './useNow'

const AddTodoSheet = lazy(() => import('./AddTodoSheet').then((m) => ({ default: m.AddTodoSheet })))
const DaySheet = lazy(() => import('./DaySheet').then((m) => ({ default: m.DaySheet })))
const ScheduleItemSheet = lazy(() =>
  import('@/features/schedule/ScheduleItemSheet').then((m) => ({ default: m.ScheduleItemSheet })),
)

type SchedulePanel = { type: 'day' } | { type: 'editor'; target: ScheduleTarget }

/** S2/S3 Today, v1: guest to-dos only (F-006). */
export function TodayPage() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const [openedAt] = useState(() => now)
  const zone = useSession((state) => (state.token ? state.user?.timezone : undefined))
  const generation = useSession((state) => state.generation)
  const today = toLocalDate(openedAt, zone)
  const intentionDate = toLocalDate(now, zone)
  const [sheet, setSheet] = useState<{
    open: boolean
    target: TodoSheetTarget
    instance: number
    generation: number
  }>({ open: false, target: { type: 'create' }, instance: 0, generation })
  const [panel, setPanel] = useState<(SchedulePanel & { generation: number }) | null>(null)
  const schedulePanel = panel?.generation === generation ? panel : null
  const streak = useStreak(today).data
  const scheduleDelete = useScheduleDelete()
  const schedule = (useScheduleDay(today).data ?? []).filter(
    (occurrence) => !scheduleDelete.isDeleting(occurrence.schedule_item_id, occurrence.date),
  )
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
    setSheet(({ instance }) => ({ open: true, target, instance: instance + 1, generation }))
  }
  const addTodo = () => openSheet({ type: 'create' })
  const openSchedule = (next: SchedulePanel) => setPanel({ ...next, generation })
  const closeSchedule = () => setPanel((current) => (current === panel ? null : current))

  return (
    <div className="flex flex-col gap-5">
      <AppPageHeader
        title={t('pages.today.title')}
        headline={t('pages.today.headline')}
        subtitle={formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        aside={streak && <StreakBadge {...streak} />}
      />

      <DailyIntention
        date={intentionDate}
        {...(intentionDate !== today && {
          dateHint: formatDate(intentionDate, { dateStyle: 'full' }),
        })}
      />

      {schedule.length > 0 && (
        <NowNextStrip now={nowItem} next={nextItem} onOpen={() => openSchedule({ type: 'day' })} />
      )}

      {todos.isPending ? (
        <LoadingState />
      ) : todos.isError ? (
        <ErrorState onRetry={() => void todos.refetch()} />
      ) : list.length === 0 ? (
        <TodayEmpty
          onAddTodo={addTodo}
          onAddSchedule={() => openSchedule({ type: 'editor', target: { type: 'create' } })}
        />
      ) : (
        <>
          <TodayProgressCard done={doneCount} total={list.length} />
          {/* pb-20: room to scroll the last row clear of the floating + */}
          <section aria-labelledby="todo-list-heading" className="flex flex-col gap-3 pb-20">
            <h2 id="todo-list-heading" className="text-base font-bold text-ink">
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
              <p
                role="alert"
                className="rounded-md border-hairline border-danger/30 bg-paper px-3.5 py-2.5 text-sm font-medium text-danger"
              >
                {t('today.saveError')}
              </p>
            )}
          </section>
          <FloatingAddButton onClick={addTodo} label={t('today.addTodo')} />
        </>
      )}

      {schedulePanel?.type === 'day' && (
        <Suspense fallback={null}>
          <DaySheet
            key={`day-${generation}`}
            open
            onClose={closeSchedule}
            date={today}
            occurrences={schedule}
            onEdit={(item, occurrence) =>
              openSchedule({ type: 'editor', target: { type: 'occurrence', item, occurrence } })
            }
          />
        </Suspense>
      )}
      {schedulePanel?.type === 'editor' && (
        <Suspense fallback={null}>
          <ScheduleItemSheet
            key={`schedule-${generation}`}
            open
            onClose={closeSchedule}
            target={schedulePanel.target}
            onDelete={scheduleDelete.request}
          />
        </Suspense>
      )}
      <SavePlanPrompt today={today} />
      {sheet.generation === generation && sheet.instance > 0 && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      <UndoDeleteToast pending={del.pending} onUndo={() => void del.undo()} error={del.error} />
      <ScheduleUndoToast
        pending={scheduleDelete.pending}
        onUndo={scheduleDelete.undo}
        error={scheduleDelete.error}
        aboveTodoToast={Boolean(del.pending || del.error)}
      />
    </div>
  )
}
