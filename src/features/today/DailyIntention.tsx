import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '@/components/ui'
import { guestPlanKey } from '@/features/auth/useGuestPlan'
import type { LocalDate } from '@/features/todos/types'
import { accountDataApi, ApiError, useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { useGuestStorage } from '@/lib/storage'

const MAX_LENGTH = 200
const SAVE_DELAY = 600
const normalize = (text: string) => text.trim() || null

// Session expiry can remount the editor. Keep the last failed draft in memory for its owner.
const expiredDrafts = new WeakMap<
  QueryClient,
  Map<string, { date: LocalDate; generation: number; text: string }>
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
    <ScopedIntention
      key={`${generation}:${props.date}`}
      {...props}
      generation={generation}
      guest={guest}
      accountId={accountId}
    />
  )
}

function ScopedIntention({
  date,
  dateHint,
  generation,
  guest,
  accountId,
}: DailyIntentionProps & { generation: number; guest: boolean; accountId: string | undefined }) {
  const { t } = useTranslation()
  const { intentions } = useGuestStorage()
  const queryClient = useQueryClient()
  const queryKey = ['daily-intention', generation, date] as const
  const recovered = !guest && accountId ? expiredDrafts.get(queryClient)?.get(accountId) : undefined
  function updateRecovery(text: string | null) {
    if (guest || !accountId) return
    const drafts = expiredDrafts.get(queryClient) ?? new Map()
    const previous = drafts.get(accountId)
    if (previous && previous.generation > generation) return
    if (text === null) {
      if (previous?.date === date) drafts.delete(accountId)
    } else {
      drafts.set(accountId, { date, generation, text })
      expiredDrafts.set(queryClient, drafts)
    }
  }
  const sessionMatches = () => useSession.getState().generation === generation
  function isCurrentDate() {
    const { token, user } = useSession.getState()
    return toLocalDate(new Date(), token ? user?.timezone : undefined) === date
  }

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
      if (!sessionMatches() || !isCurrentDate())
        throw new Error('Intention date or session changed')
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
    return (
      <div className="flex flex-col gap-1.5">
        <Input label={t('intention.label')} placeholder={t('intention.placeholder')} disabled />
        {intention.isError ? (
          <>
            <p role="alert" className="text-sm font-semibold text-danger">
              {t('intention.loadError')}
            </p>
            <Button variant="ghost" className="self-start" onClick={() => void intention.refetch()}>
              {t('intention.retryLoad')}
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
      recoveredDraft={recovered?.date === date ? recovered.text : null}
      updateRecovery={updateRecovery}
      save={save.mutateAsync}
      canSave={() => sessionMatches() && isCurrentDate()}
      dateHint={dateHint}
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
}

function IntentionEditor({
  stored,
  readStored,
  recoveredDraft,
  updateRecovery,
  save,
  canSave,
  dateHint,
}: IntentionEditorProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(recoveredDraft)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    recoveredDraft === null ? 'idle' : 'error',
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
      setStatus(unchanged || normalize(latest.current ?? '') === result ? 'saved' : 'idle')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) updateRecovery(latest.current)
      if (active.current && canSave()) {
        setStatus(normalize(latest.current ?? '') === readStored() ? 'idle' : 'error')
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
    timer.current = setTimeout(() => void flush(), SAVE_DELAY)
  }

  return (
    <div className="flex flex-col gap-1.5">
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
      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-x-2">
          <p role="alert" className="text-sm font-semibold text-danger">
            {t('intention.saveError')}
          </p>
          <Button variant="ghost" onClick={() => void flush()}>
            {t('intention.retrySave')}
          </Button>
        </div>
      )}
    </div>
  )
}
