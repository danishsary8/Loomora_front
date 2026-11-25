import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionToast, Button, Card, Input, Sheet } from '@/components/ui'
import { CheckIcon, TrashIcon } from '@/components/ui/icons'
import { FormError } from '@/features/auth/FormError'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import type { LocalDate } from '@/features/todos/types'
import { useTodayTodos } from '@/features/todos/useTodos'
import { useSession } from '@/lib/api'
import { isLocalDate, toLocalDate } from '@/lib/date'
import { useClockDisplay } from '@/lib/time/useTimePreferences'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import type { FocusSession } from './types'
import { useFocusHistory } from './useFocusHistory'
import { useFocusHistoryDelete } from './useFocusHistoryDelete'

const historyModes = ['all', 'countdown', 'stopwatch'] as const
type HistoryMode = (typeof historyModes)[number]

const deleteButtonClass =
  'grid size-11 shrink-0 place-items-center rounded-md border-control border-border-control/70 bg-paper text-ink transition-[background-color,transform] duration-fast ease-elemental hover:bg-subtle active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100'

interface DisplayRow {
  session: FocusSession
  id: string
  started_at: string
  modeText: string
  startText: string
  outcomeText: string
  linkedText: string
  durationText: string
}

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
  const del = useFocusHistoryDelete()
  const [pendingDelete, setPendingDelete] = useState<{
    row: DisplayRow
    generation: number
  } | null>(null)
  const activePending = pendingDelete?.generation === generation ? pendingDelete.row : null

  function openDelete(row: DisplayRow) {
    del.clearDeleteError()
    setPendingDelete({ row, generation })
  }

  function closeDelete() {
    if (del.deletingId) return
    del.clearDeleteError()
    setPendingDelete(null)
  }

  async function handleConfirmDelete() {
    if (!activePending) return
    const ok = await del.confirmDelete(activePending.session)
    if (ok) setPendingDelete(null)
  }

  return (
    <>
      <section aria-labelledby={heading} className="min-w-0">
        <Card className="flex min-w-0 flex-col gap-4">
          <h2 id={heading} className="text-xl font-semibold">
            {t('focus.history.title')}
          </h2>
          <HistoryDay
            key={`${generation}:${zone ?? ''}`}
            zone={zone}
            deletingId={del.deletingId}
            onDelete={openDelete}
          />
        </Card>
      </section>
      <DeleteFocusSessionSheet
        row={activePending}
        deleting={del.deletingId !== null}
        error={del.deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onClose={closeDelete}
      />
      <ActionToast
        message={
          del.undoSession ? t('focus.history.deleted') : del.toastError ? del.toastError : null
        }
        actionLabel={
          del.undoSession
            ? t(del.restoring ? 'focus.history.undoing' : 'focus.history.undo')
            : undefined
        }
        actionDisabled={del.restoring}
        onAction={del.undoSession ? () => void del.undoDelete() : undefined}
        tone={!del.undoSession && del.toastError ? 'danger' : 'default'}
      />
    </>
  )
}

function HistoryDay({
  zone,
  deletingId,
  onDelete,
}: {
  zone?: string
  deletingId: string | null
  onDelete: (row: DisplayRow) => void
}) {
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
            deletingId={deletingId}
            onDelete={onDelete}
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

function DeleteFocusSessionSheet({
  row,
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  row: DisplayRow | null
  deleting: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Sheet open={row !== null} onClose={onClose} title={t('focus.history.deleteTitle')}>
      {row && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border-hairline border-border-subtle bg-subtle/60 p-3 text-sm">
            <p className="font-semibold tabular-nums text-ink">
              {t('focus.history.deleteSummary', {
                mode: row.modeText,
                time: row.startText,
                duration: row.durationText,
              })}
            </p>
            {row.linkedText && (
              <p className="mt-1 text-muted [overflow-wrap:anywhere]">{row.linkedText}</p>
            )}
          </div>
          <p className="text-sm text-muted">{t('focus.history.deleteHint')}</p>
          <FormError message={error ?? undefined} />
          <Button variant="danger" size="lg" fullWidth disabled={deleting} onClick={onConfirm}>
            {t(deleting ? 'focus.history.deleting' : 'focus.history.deleteConfirm')}
          </Button>
          <Button variant="secondary" size="lg" fullWidth disabled={deleting} onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function HistoryRows({
  todoDate,
  sessions,
  loading,
  duration,
  mode,
  search,
  deletingId,
  onDelete,
}: {
  todoDate: LocalDate
  sessions: FocusSession[] | undefined
  loading: boolean
  duration: (ms: number) => string
  mode: HistoryMode
  search: string
  deletingId: string | null
  onDelete: (row: DisplayRow) => void
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
  const rows: DisplayRow[] = (sessions ?? []).flatMap((session) => {
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
    return [{ session, id, started_at, modeText, startText, outcomeText, linkedText, durationText }]
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
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
            >
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <p className="font-semibold">{row.modeText}</p>
                <p className="flex flex-wrap gap-x-3 text-sm text-muted">
                  <time dateTime={row.started_at} className="tabular-nums">
                    {row.startText}
                  </time>
                  <span>{row.outcomeText}</span>
                </p>
                {row.linkedText && (
                  <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                    {row.linkedText}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2">
                <p className="min-w-0 font-semibold tabular-nums [overflow-wrap:anywhere]">
                  {row.durationText}
                </p>
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => onDelete(row)}
                  aria-label={t('focus.history.deleteLabel', {
                    time: row.startText,
                    duration: row.durationText,
                  })}
                  className={deleteButtonClass}
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
