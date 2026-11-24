import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input } from '@/components/ui'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import type { LocalDate } from '@/features/todos/types'
import { useTodayTodos } from '@/features/todos/useTodos'
import { useSession } from '@/lib/api'
import { isLocalDate, toLocalDate } from '@/lib/date'
import { useClockDisplay } from '@/lib/time/useTimePreferences'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import type { FocusSession } from './types'
import { useFocusHistory } from './useFocusHistory'

function durationFormatter(locale: string) {
  const unit = (unit: string) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, maximumFractionDigits: 3 })
  const hours = unit('hour')
  const minutes = unit('minute')
  const seconds = unit('second')
  const list = new Intl.ListFormat(locale, { type: 'unit' })
  return (ms: number) => {
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    const s = (ms % 60_000) / 1000
    const parts = []
    if (h) parts.push(hours.format(h))
    if (m) parts.push(minutes.format(m))
    if (s || parts.length === 0) parts.push(seconds.format(s))
    return list.format(parts)
  }
}

export function FocusHistory() {
  const { t } = useTranslation()
  const heading = useId()
  const generation = useSession((state) => state.generation)
  const zone = useSession((state) => (state.token ? state.user?.timezone : undefined))

  return (
    <section aria-labelledby={heading} className="min-w-0">
      <Card className="flex min-w-0 flex-col gap-4">
        <h2 id={heading} className="text-xl font-semibold">
          {t('focus.history.title')}
        </h2>
        <HistoryDay key={`${generation}:${zone ?? ''}`} zone={zone} />
      </Card>
    </section>
  )
}

function HistoryDay({ zone }: { zone?: string }) {
  const { t, i18n } = useTranslation()
  const today = toLocalDate(new Date(), zone)
  const [date, setDate] = useState<LocalDate>(today)
  const validDate = isLocalDate(date)
  const input = useRef<HTMLInputElement>(null)
  const online = useOnlineStatus()
  const { account, available, data, isError, isPaused, refetch } = useFocusHistory(date)
  const offline = account && (isPaused || !online)
  const duration = durationFormatter(i18n.language)

  return (
    <>
      <Input
        ref={input}
        type="date"
        label={t('focus.history.date')}
        value={date}
        className="max-w-64 [&_input]:min-w-0"
        onChange={(event) => setDate(event.target.value)}
      />
      {validDate ? (
        <>
          {offline && (
            <p role="status" className="rounded-md bg-warning-surface p-3 text-sm text-warning">
              {t(data ? 'focus.history.offlineCached' : 'focus.history.offline')}
            </p>
          )}
          {!offline && (isError || !available) && (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm text-danger">
                {t('focus.history.error')}
              </p>
              {available && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    input.current?.focus()
                    void refetch()
                  }}
                >
                  {t('focus.retry')}
                </Button>
              )}
            </div>
          )}
          {data ? (
            <>
              <dl className="rounded-md bg-primary-soft p-3" aria-live="polite">
                <dt className="text-sm font-semibold text-primary">{t('focus.history.total')}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{duration(data.totalMs)}</dd>
              </dl>
              {data.sessions.length ? (
                <HistoryRows
                  todoDate={account ? today : date}
                  sessions={data.sessions}
                  duration={duration}
                />
              ) : (
                <p className="text-sm text-muted">{t('focus.history.empty')}</p>
              )}
            </>
          ) : !offline && !isError && available ? (
            <p role="status" className="text-sm text-muted">
              {t('focus.history.loading')}
            </p>
          ) : null}
        </>
      ) : (
        <p role="status" className="text-sm text-muted">
          {t('focus.history.chooseDate')}
        </p>
      )}
    </>
  )
}

function HistoryRows({
  todoDate,
  sessions,
  duration,
}: {
  todoDate: LocalDate
  sessions: FocusSession[]
  duration: (ms: number) => string
}) {
  const { t } = useTranslation()
  const clock = useClockDisplay()
  // The account Today endpoint only serves dates close to account-local today.
  const todos = useTodayTodos(
    todoDate,
    sessions.some((row) => Boolean(row.todo_id && !row.label)),
  )
  const schedule = useScheduleItems(
    sessions.some((row) => Boolean(row.schedule_item_id && !row.label)),
  )
  const todoTitles = new Map(
    todos.data?.flatMap((todo) => [todo, ...todo.subtasks]).map((todo) => [todo.id, todo.title]),
  )
  const scheduleTitles = new Map(schedule.data?.map((item) => [item.id, item.title]))

  return (
    <ol role="list" className="divide-y divide-border-subtle">
      {sessions.map((session) => {
        const { id, label, todo_id, schedule_item_id, started_at, focus_ms, mode, end_reason } =
          session
        const title = todo_id
          ? todoTitles.get(todo_id)
          : schedule_item_id
            ? scheduleTitles.get(schedule_item_id)
            : undefined
        const item = label || title
        return (
          <li
            key={id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold">{t(`focus.${mode}`)}</p>
              <p className="flex flex-wrap gap-x-3 text-sm text-muted">
                <time dateTime={started_at} className="tabular-nums">
                  {clock.instant(started_at)}
                </time>
                <span>{t(`focus.history.${end_reason}`)}</span>
              </p>
              {(item || todo_id || schedule_item_id) && (
                <p className="mt-1 text-sm text-muted">
                  {item
                    ? t('focus.linkedItem', { title: item })
                    : t(
                        todo_id
                          ? 'focus.history.todoUnavailable'
                          : 'focus.history.scheduleUnavailable',
                      )}
                </p>
              )}
            </div>
            <p className="min-w-0 font-semibold tabular-nums">{duration(focus_ms)}</p>
          </li>
        )
      })}
    </ol>
  )
}
