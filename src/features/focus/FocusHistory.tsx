import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input } from '@/components/ui'
import { CheckIcon } from '@/components/ui/icons'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import type { LocalDate } from '@/features/todos/types'
import { useTodayTodos } from '@/features/todos/useTodos'
import { useSession } from '@/lib/api'
import { isLocalDate, toLocalDate } from '@/lib/date'
import { useClockDisplay } from '@/lib/time/useTimePreferences'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import type { FocusSession } from './types'
import { useFocusHistory } from './useFocusHistory'

const historyModes = ['all', 'countdown', 'stopwatch'] as const
type HistoryMode = (typeof historyModes)[number]

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
  const modeName = useId()
  const [mode, setMode] = useState<HistoryMode>('all')
  const [search, setSearch] = useState('')
  const validDate = isLocalDate(date)
  const input = useRef<HTMLInputElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
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
          <div className="flex min-w-0 flex-col gap-3">
            <Input
              ref={searchInput}
              type="search"
              label={t('focus.history.search')}
              className="min-w-0 [&_input]:min-w-0"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-bold">{t('focus.history.mode')}</legend>
              <div className="flex flex-wrap gap-2">
                {historyModes.map((value) => (
                  <label key={value} className="relative min-w-11 max-w-full flex-auto">
                    <input
                      className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                      type="radio"
                      name={modeName}
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                    />
                    <span className="flex h-full min-h-touch flex-wrap items-center justify-center gap-x-1 rounded-md border-control border-border-control bg-paper px-2 py-1 text-center text-sm font-semibold [overflow-wrap:anywhere] peer-hover:bg-subtle peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                      {mode === value && <CheckIcon className="size-4 shrink-0" />}
                      {t(value === 'all' ? 'focus.history.allModes' : `focus.${value}`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              variant="ghost"
              className="max-w-full self-start !px-3"
              disabled={mode === 'all' && search === ''}
              onClick={() => {
                setMode('all')
                setSearch('')
                searchInput.current?.focus()
              }}
            >
              {t('focus.history.clearFilters')}
            </Button>
          </div>
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
          {data && (
            <dl className="rounded-md bg-primary-soft p-3" aria-live="polite">
              <dt className="text-sm font-semibold text-primary">{t('focus.history.total')}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{duration(data.totalMs)}</dd>
            </dl>
          )}
          <HistoryRows
            todoDate={account ? today : date}
            sessions={data?.sessions}
            loading={!data && !offline && !isError && available}
            duration={duration}
            mode={mode}
            search={search}
          />
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
  loading,
  duration,
  mode,
  search,
}: {
  todoDate: LocalDate
  sessions: FocusSession[] | undefined
  loading: boolean
  duration: (ms: number) => string
  mode: HistoryMode
  search: string
}) {
  const { t } = useTranslation()
  const clock = useClockDisplay()
  // The account Today endpoint only serves dates close to account-local today.
  const todos = useTodayTodos(
    todoDate,
    sessions?.some((row) => Boolean(row.todo_id && !row.label)) ?? false,
  )
  const schedule = useScheduleItems(
    sessions?.some((row) => Boolean(row.schedule_item_id && !row.label)) ?? false,
  )
  const todoTitles = new Map(
    todos.data?.flatMap((todo) => [todo, ...todo.subtasks]).map((todo) => [todo.id, todo.title]),
  )
  const scheduleTitles = new Map(schedule.data?.map((item) => [item.id, item.title]))

  const query = search.trim()
  const match = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu') : null
  const rows = (sessions ?? []).flatMap((session) => {
    if (mode !== 'all' && session.mode !== mode) return []
    const { id, label, todo_id, schedule_item_id, started_at, focus_ms, end_reason } = session
    const title = todo_id
      ? todoTitles.get(todo_id)
      : schedule_item_id
        ? scheduleTitles.get(schedule_item_id)
        : undefined
    const item = label || title
    const linkedText = item
      ? t('focus.linkedItem', { title: item })
      : todo_id
        ? t('focus.history.todoUnavailable')
        : schedule_item_id
          ? t('focus.history.scheduleUnavailable')
          : ''
    const modeText = t(`focus.${session.mode}`)
    const startText = clock.instant(started_at)
    const outcomeText = t(`focus.history.${end_reason}`)
    const durationText = duration(focus_ms)
    if (
      match &&
      ![modeText, startText, outcomeText, linkedText, durationText].some((text) => match.test(text))
    )
      return []
    return [{ id, started_at, modeText, startText, outcomeText, linkedText, durationText }]
  })

  const status = loading
    ? t('focus.history.loading')
    : sessions?.length === 0
      ? t('focus.history.empty')
      : sessions && !rows.length
        ? t('focus.history.noResults')
        : ''

  return (
    <>
      <p role="status" className="text-sm text-muted empty:sr-only">
        {status}
      </p>
      {rows.length > 0 && (
        <ol role="list" className="divide-y divide-border-subtle">
          {rows.map(
            ({ id, started_at, modeText, startText, outcomeText, linkedText, durationText }) => (
              <li
                key={id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{modeText}</p>
                  <p className="flex flex-wrap gap-x-3 text-sm text-muted">
                    <time dateTime={started_at} className="tabular-nums">
                      {startText}
                    </time>
                    <span>{outcomeText}</span>
                  </p>
                  {linkedText && (
                    <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{linkedText}</p>
                  )}
                </div>
                <p className="min-w-0 font-semibold tabular-nums">{durationText}</p>
              </li>
            ),
          )}
        </ol>
      )}
    </>
  )
}
