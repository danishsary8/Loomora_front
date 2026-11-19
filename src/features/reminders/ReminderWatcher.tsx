import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { changeTodayTodo } from '@/features/todos/todayCache'
import type { TodayTodo, Todo } from '@/features/todos/types'
import { todoKeys, useSetTodoDone } from '@/features/todos/useTodos'
import { errorMessageKey, useSession, useServiceStatus } from '@/lib/api'
import { useTodoRepository } from '@/lib/storage'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { ReminderBanner, type ReminderAction } from './ReminderBanner'

const POLL_MS = 30_000

function isVisible() {
  return document.visibilityState !== 'hidden'
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}

function reminderKey(todo: Todo) {
  return `${todo.id}:${todo.remind_at}`
}

export function ReminderWatcher() {
  const accountId = useSession((state) => (state.token ? state.user?.id : null)) ?? null
  return <ActiveReminderWatcher key={accountId ?? 'guest'} accountId={accountId} />
}

function ActiveReminderWatcher({ accountId }: { accountId: string | null }) {
  const { t } = useTranslation()
  const repo = useTodoRepository()
  const token = useSession((state) => state.token)
  const client = useQueryClient()
  const online = useOnlineStatus()
  const serviceDown = useServiceStatus((state) => state.down)
  const visible = useSyncExternalStore(subscribeVisibility, isVisible)
  // Today can remain open across midnight, so update every cached Today date.
  const complete = useSetTodoDone(undefined, 'always')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ key: string; message: string }>()
  const [activeKey, setActiveKey] = useState<string>()
  const actionPending = useRef(false)
  const banner = useRef<HTMLDivElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const key = todoKeys.reminders(accountId)
  const enabled = visible && !busy && (!accountId || online)
  const {
    data,
    isFetchedAfterMount,
    isError,
    error: readError,
    refetch,
  } = useQuery({
    queryKey: key,
    // Guest reads can run offline. Passing the signal cancels account reads on a session change.
    queryFn: ({ signal }) => {
      if (useSession.getState().token !== token) throw new Error('Session changed')
      return repo.listDueReminders(signal)
    },
    enabled,
    networkMode: 'always',
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    staleTime: 0,
  })

  const due = isFetchedAfterMount ? data : undefined
  const current = due?.find((row) => reminderKey(row) === activeKey) ?? due?.[0]
  const currentKey = current && reminderKey(current)
  if (currentKey !== activeKey) setActiveKey(currentKey)
  useLayoutEffect(() => {
    const previous = lastFocused.current
    if (!previous || previous.isConnected || document.activeElement !== document.body) return
    lastFocused.current = null
    const next = banner.current?.querySelector<HTMLElement>('h2')
    ;(next ?? document.getElementById('main'))?.focus({ preventScroll: true })
  }, [currentKey])

  useEffect(() => {
    if (!enabled) return
    function onFocus() {
      if (isVisible() && !actionPending.current) void refetch({ cancelRefetch: false })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [enabled, refetch])

  async function act(action: ReminderAction) {
    const sameSession = () => useSession.getState().token === token
    if (!current || !currentKey || actionPending.current || !sameSession()) return
    if (token && !online) {
      setError({ key: currentKey, message: t('errors.network') })
      return
    }

    actionPending.current = true
    setBusy(true)
    setError(undefined)
    try {
      await client.cancelQueries({ queryKey: key, exact: true })
      if (!sameSession()) return
      if (action === 'done') {
        await complete.mutateAsync({ id: current.id, done: true, sessionToken: token })
      } else if (action === 'dismiss') await repo.dismissReminder(current.id)
      else {
        const saved = await repo.snoozeReminder(current.id, action)
        if (!sameSession()) return
        client.setQueriesData<TodayTodo[]>(
          { queryKey: todoKeys.lists },
          (list) =>
            list &&
            changeTodayTodo(list, saved.id, (todo) => ({ ...todo, remind_at: saved.remind_at })),
        )
      }
      if (!sameSession()) return
      client.setQueryData<Todo[]>(key, (rows) => rows?.filter(({ id }) => id !== current.id))
    } catch (cause) {
      if (sameSession()) setError({ key: currentKey, message: t(errorMessageKey(cause)) })
    } finally {
      actionPending.current = false
      setBusy(false)
    }
  }

  return (
    <div
      ref={banner}
      className="sticky top-0 z-30"
      onFocusCapture={(event) => {
        lastFocused.current = event.target
      }}
      onBlurCapture={(event) => {
        if (event.target.isConnected && !event.currentTarget.contains(event.relatedTarget)) {
          lastFocused.current = null
        }
      }}
    >
      <div role="status" aria-atomic="true" className="sr-only">
        {current && t('reminders.announcement', { title: current.title })}
      </div>
      {current && (
        <ReminderBanner
          key={currentKey}
          title={current.title}
          remindAt={current.remind_at}
          busy={busy}
          error={error?.key === currentKey ? error?.message : undefined}
          onAction={(action) => void act(action)}
        />
      )}
      {isError && !current && (!accountId || (!serviceDown && online)) && (
        <p role="status" className="bg-paper px-4 py-2 text-center text-sm font-bold text-danger">
          {t('reminders.checkError')} {t(errorMessageKey(readError))}
        </p>
      )}
    </div>
  )
}
