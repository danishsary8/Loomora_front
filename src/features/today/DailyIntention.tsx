import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnsavedDraft } from '@/app/pwaUpdate'
import { Button, Input } from '@/components/ui'
import { guestPlanKey } from '@/features/auth/useGuestPlan'
import type { LocalDate } from '@/features/todos/types'
import { accountDataApi, ApiError, useSession } from '@/lib/api'
import { useGuestStorage } from '@/lib/storage'

const MAX_LENGTH = 200
const SAVE_DELAY = 600
const normalize = (text: string) => text.trim() || null

// A failed save can outlive its editor. Keep drafts in memory by owner and date.
const failedDrafts = new WeakMap<
  QueryClient,
  Map<string, Map<LocalDate, { generation: number; text: string }>>
>()

interface DailyIntentionProps {
  date: LocalDate
  dateHint?: string
}

export function DailyIntention(props: DailyIntentionProps) {
  const generation = useSession((state) => state.generation)
  const guest = useSession((state) => state.token === null)
  const accountId = useSession((state) => state.user?.id)
  return (
    <IntentionSession
      key={generation}
      {...props}
      generation={generation}
      guest={guest}
      owner={guest ? 'guest' : accountId ? `account:${accountId}` : null}
    />
  )
}

type SessionProps = DailyIntentionProps & {
  generation: number
  guest: boolean
  owner: string | null
}

function IntentionSession({ date, dateHint, ...session }: SessionProps) {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const [pendingDates, setPendingDates] = useState<LocalDate[]>(() =>
    session.owner ? [...(failedDrafts.get(queryClient)?.get(session.owner)?.keys() ?? [])] : [],
  )

  function trackPending(day: LocalDate, pending: boolean) {
    setPendingDates((dates) => {
      if (pending === dates.includes(day)) return dates
      return pending ? [...dates, day] : dates.filter((savedDate) => savedDate !== day)
    })
  }

  // Keep the editor and its debounce alive across midnight while it has an unsaved draft.
  return [date, ...pendingDates.filter((day) => day !== date)].map((day) => (
    <ScopedIntention
      key={day}
      {...session}
      date={day}
      dateHint={day === date ? dateHint : undefined}
      previousDateLabel={
        day === date
          ? undefined
          : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
              new Date(`${day}T00:00:00`),
            )
      }
      onPendingChange={(pending) => trackPending(day, pending)}
    />
  ))
}

function ScopedIntention({
  date,
  dateHint,
  generation,
  guest,
  owner,
  previousDateLabel,
  onPendingChange,
}: SessionProps & {
  previousDateLabel?: string
  onPendingChange: (pending: boolean) => void
}) {
  const { t } = useTranslation()
  const { intentions } = useGuestStorage()
  const queryClient = useQueryClient()
  const queryKey = ['daily-intention', generation, date] as const
  const recovered = owner ? failedDrafts.get(queryClient)?.get(owner)?.get(date) : undefined
  function updateRecovery(text: string | null) {
    if (!owner) return
    const owners = failedDrafts.get(queryClient) ?? new Map()
    const drafts = owners.get(owner) ?? new Map()
    const previous = drafts.get(date)
    if (previous && previous.generation > generation) return
    if (text === null) {
      drafts.delete(date)
      if (drafts.size === 0) owners.delete(owner)
    } else {
      drafts.set(date, { generation, text })
      owners.set(owner, drafts)
      failedDrafts.set(queryClient, owners)
    }
  }
  const sessionMatches = () => useSession.getState().generation === generation

  const intention = useQuery({
    queryKey,
    networkMode: 'always',
    retry: false,
    queryFn: async ({ signal }) => {
      if (!sessionMatches()) throw new Error('Session changed')
      return guest
        ? intentions.get(date)
        : (await accountDataApi.getDailyIntention(date, signal)).text
    },
  })
  const save = useMutation({
    scope: { id: queryKey.join(':') },
    networkMode: 'always',
    mutationFn: async (text: string | null) => {
      if (!sessionMatches()) throw new Error('Session changed')
      const saved = guest
        ? await intentions.save(date, text)
        : (await accountDataApi.putDailyIntention(date, text)).text
      // A refresh started before the save can carry the previous value.
      await queryClient.cancelQueries({ queryKey, exact: true })
      if (sessionMatches()) {
        queryClient.setQueryData(queryKey, saved)
        if (guest) {
          void queryClient.invalidateQueries({ queryKey: guestPlanKey })
        }
      }
      return saved
    },
  })

  if (intention.data === undefined) {
    if (previousDateLabel && !intention.isError) return null
    return (
      <div className="flex flex-col gap-1.5">
        {!previousDateLabel && (
          <Input label={t('intention.label')} placeholder={t('intention.placeholder')} disabled />
        )}
        {intention.isError ? (
          <>
            <p role="alert" className="text-sm font-semibold text-danger">
              {t('intention.loadError')}
            </p>
            <Button variant="ghost" className="self-start" onClick={() => void intention.refetch()}>
              {previousDateLabel
                ? t('intention.retryLoadForDate', { date: previousDateLabel })
                : t('intention.retryLoad')}
            </Button>
          </>
        ) : (
          <p role="status" className="text-sm text-muted">
            {t('common.loading')}
          </p>
        )}
      </div>
    )
  }

  return (
    <IntentionEditor
      stored={intention.data}
      readStored={() => queryClient.getQueryData<string | null>(queryKey) ?? null}
      recoveredDraft={recovered?.text ?? null}
      updateRecovery={updateRecovery}
      save={save.mutateAsync}
      canSave={sessionMatches}
      dateHint={dateHint}
      previousDateLabel={previousDateLabel}
      onPendingChange={onPendingChange}
    />
  )
}

interface IntentionEditorProps {
  stored: string | null
  readStored: () => string | null
  recoveredDraft: string | null
  updateRecovery: (text: string | null) => void
  save: (text: string | null) => Promise<string | null>
  canSave: () => boolean
  dateHint?: string | undefined
  previousDateLabel?: string | undefined
  onPendingChange: (pending: boolean) => void
}

function IntentionEditor({
  stored,
  readStored,
  recoveredDraft,
  updateRecovery,
  save,
  canSave,
  dateHint,
  previousDateLabel,
  onPendingChange,
}: IntentionEditorProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(recoveredDraft)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    recoveredDraft === null ? 'idle' : 'error',
  )
  useUnsavedDraft(
    `intention:${previousDateLabel ?? 'current'}`,
    draft !== null || status === 'saving' || status === 'error',
  )
  const latest = useRef(recoveredDraft)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const active = useRef(false)
  // Undefined means idle. Null is an in-flight clear.
  const inFlight = useRef<string | null>()
  const queued = useRef(false)

  useLayoutEffect(() => {
    active.current = true
    return () => {
      active.current = false
      clearTimeout(timer.current)
    }
  }, [])

  async function flush() {
    clearTimeout(timer.current)
    if (!active.current || !canSave()) return
    const sentDraft = latest.current
    if (sentDraft === null) return
    const text = normalize(sentDraft)
    if (inFlight.current !== undefined) {
      queued.current = text !== inFlight.current
      return
    }
    if (text === readStored()) {
      updateRecovery(null)
      setStatus((current) => (current === 'error' ? 'idle' : current))
      onPendingChange(false)
      return
    }

    inFlight.current = text
    setStatus('saving')
    try {
      const result = await save(text)
      updateRecovery(null)
      if (!active.current || !canSave()) return
      const unchanged = latest.current === sentDraft
      if (unchanged) {
        latest.current = null
        setDraft(null)
      }
      const settled = unchanged || normalize(latest.current ?? '') === result
      setStatus(settled ? 'saved' : 'idle')
      if (settled) onPendingChange(false)
    } catch (error) {
      const unsaved = normalize(latest.current ?? '') !== readStored()
      if (error instanceof ApiError && error.status === 401) updateRecovery(latest.current)
      else if (canSave()) updateRecovery(unsaved ? latest.current : null)
      if (active.current && canSave()) {
        setStatus(unsaved ? 'error' : 'idle')
        if (!unsaved) onPendingChange(false)
      }
    } finally {
      inFlight.current = undefined
      if (queued.current) {
        queued.current = false
        void flush()
      }
    }
  }

  function change(value: string) {
    clearTimeout(timer.current)
    queued.current = false
    // OpenAPI counts Unicode code points after trimming.
    const trimmed = Array.from(value.trim())
    latest.current = trimmed.length > MAX_LENGTH ? trimmed.slice(0, MAX_LENGTH).join('') : value
    setDraft(latest.current)
    if (inFlight.current === undefined) setStatus('idle')
    const pending = inFlight.current !== undefined || normalize(latest.current) !== readStored()
    onPendingChange(pending)
    if (!pending) updateRecovery(null)
    timer.current = setTimeout(() => void flush(), SAVE_DELAY)
  }

  if (previousDateLabel && status !== 'error') return null

  return (
    <div className="flex flex-col gap-1.5">
      {!previousDateLabel && (
        <>
          <Input
            label={t('intention.label')}
            placeholder={t('intention.placeholder')}
            hint={dateHint ? t('intention.dateHint', { date: dateHint }) : undefined}
            value={draft ?? stored ?? ''}
            onChange={(event) => change(event.currentTarget.value)}
            onBlur={() => void flush()}
          />
          <p role="status" className="min-h-5 text-sm text-muted">
            {status === 'saving' && t('intention.saving')}
            {status === 'saved' && t('intention.saved')}
          </p>
        </>
      )}
      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-x-2">
          <p role="alert" className="text-sm font-semibold text-danger">
            {previousDateLabel
              ? t('intention.saveErrorForDate', { date: previousDateLabel })
              : t('intention.saveError')}
          </p>
          <Button variant="ghost" onClick={() => void flush()}>
            {previousDateLabel
              ? t('intention.retrySaveForDate', { date: previousDateLabel })
              : t('intention.retrySave')}
          </Button>
        </div>
      )}
    </div>
  )
}
