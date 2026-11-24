import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { Button, Card, Input, SegmentedControl } from '@/components/ui'
import { CheckIcon } from '@/components/ui/icons'
import { useSession } from '@/lib/api'
import { FocusAttachment } from './FocusAttachment'
import { FocusHistory } from './FocusHistory'
import { FocusReadout, LapList } from './FocusReadout'
import { MissingScheduleRecovery } from './MissingScheduleRecovery'
import { FocusRuntimeContext } from './focusRuntimeContext'
import type { FocusRuntime } from './focusRuntime'
import { isFocusSoundMuted, setFocusSoundMuted, subscribeToFocusSoundMute } from './focusSound'
import {
  customDurationLimits,
  isCountdownMinutes,
  phaseType,
  type TimerCommand,
  type TimerConfig,
} from './focusTimerState'
import { countdownPresetsMs } from './timerMath'
import { useFocusSession } from './useFocusSession'
import { useRefreshFocusHistory } from './useFocusHistory'

const presets = Object.keys(countdownPresetsMs)
const [minMinutes, maxMinutes] = customDurationLimits

export function FocusPage() {
  const { t } = useTranslation()
  const runtime = useContext(FocusRuntimeContext)
  const generation = useSession((state) => state.generation)
  return (
    <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-4 [overflow-wrap:anywhere]">
      <PageHeading>{t('pages.focus.title')}</PageHeading>
      {runtime ? (
        <FocusSession key={generation} runtime={runtime} />
      ) : (
        <Card>
          {runtime === undefined ? (
            <p role="status">{t('focus.loading')}</p>
          ) : (
            <p role="alert">{t('focus.unavailable')}</p>
          )}
        </Card>
      )}
      <FocusHistory />
    </div>
  )
}

function FocusSession({ runtime }: { runtime: FocusRuntime }) {
  const { t } = useTranslation()
  const { observed, pending, busy, actionError, run, reload } = useFocusSession(runtime)
  useRefreshFocusHistory(pending)
  const [mode, setMode] = useState<TimerConfig['mode']>('countdown')
  const [preset, setPreset] = useState(presets[0])
  const [minutes, setMinutes] = useState(presets[0])
  const [invalid, setInvalid] = useState(false)
  const minutesField = useRef<HTMLInputElement>(null)
  const primaryButton = useRef<HTMLButtonElement>(null)
  const restorePrimary = useRef<'end' | 'retry' | { recoveringId: string }>()
  const snapshot = observed?.snapshot
  const running = snapshot?.phase.status === 'running'
  const paused = snapshot?.phase.status === 'paused'
  const activeMode = snapshot?.config.mode ?? mode
  const muted = useSyncExternalStore(subscribeToFocusSoundMute, isFocusSoundMuted)
  const command: TimerCommand = running ? 'pause' : paused ? 'resume' : 'next'
  const duration = Number(preset === 'custom' ? minutes : preset)
  const durationError = t('focus.durationError', { min: minMinutes, max: maxMinutes })
  const retryable = pending?.some((session) => session.attempts > 0 && !session.blockedStatus)

  useEffect(() => {
    const endRemoved = restorePrimary.current === 'end' && snapshot === null
    const retryRemoved = restorePrimary.current === 'retry' && pending && !retryable
    const recovery = restorePrimary.current
    const recoveryRemoved =
      typeof recovery === 'object' &&
      pending &&
      !pending.some((session) => session.id === recovery.recoveringId && session.missingSchedule)
    if (endRemoved || retryRemoved || recoveryRemoved) {
      restorePrimary.current = undefined
      if (document.activeElement === document.body) primaryButton.current?.focus()
    }
  }, [snapshot, pending, retryable])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (snapshot) {
      run(() => runtime.command(snapshot, command))
      return
    }
    if (mode === 'countdown' && !isCountdownMinutes(duration)) {
      setInvalid(true)
      minutesField.current?.focus()
      return
    }
    primaryButton.current?.focus()
    const selected = new FormData(event.currentTarget).get('attachment')
    const attachment = typeof selected === 'string' ? selected : ''
    const [kind, id] = attachment.split(':')
    const link =
      kind === 'todo' ? { todo_id: id } : kind === 'schedule' ? { schedule_item_id: id } : {}
    run(() =>
      runtime.start({
        ...link,
        ...(mode === 'countdown' ? { mode, minutes: duration } : { mode }),
      }),
    )
  }

  function end(command: 'finish' | 'endEarly') {
    if (!snapshot || busy) return
    restorePrimary.current = 'end'
    run(() => runtime.command(snapshot, command), 'finish')
  }

  if (!observed || observed.error) {
    return (
      <Card className="flex flex-col items-start gap-3">
        {observed?.error ? (
          <>
            <p role="alert">{t('focus.unavailable')}</p>
            <Button variant="secondary" onClick={reload}>
              {t('focus.retry')}
            </Button>
          </>
        ) : (
          <p role="status">{t('focus.loading')}</p>
        )}
      </Card>
    )
  }

  const primaryLabel =
    snapshot?.phase.status === 'waiting'
      ? t(`focus.startPhase.${phaseType(snapshot.phase.index)}`)
      : snapshot
        ? t(running ? 'focus.pause' : 'focus.resume')
        : t('focus.start')

  const rejected = pending?.some((session) => session.blockedStatus && !session.missingSchedule)
  const missingSchedules = pending?.filter((session) => session.missingSchedule) ?? []
  const saving = pending?.some((session) => session.attempts === 0)
  const finishing = busy === 'finish'
  const failed = pending === null

  return (
    <form
      className="flex min-w-0 flex-col gap-4 [&_button[aria-disabled=true]]:cursor-not-allowed [&_button[aria-disabled=true]]:opacity-50"
      onClick={() => {
        if (activeMode === 'countdown') runtime.unlockCountdownSound()
      }}
      onSubmit={submit}
      noValidate
    >
      {!snapshot && (
        <SegmentedControl
          label={t('focus.mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'countdown', label: t('focus.countdown') },
            { value: 'stopwatch', label: t('focus.stopwatch') },
          ]}
          className="flex-wrap gap-2 [&>button]:min-w-0 [&>button]:px-2 [&>button]:[overflow-wrap:anywhere]"
        />
      )}
      <Card className="flex min-w-0 flex-col gap-4 px-[min(1.5rem,3vw)] [container-type:inline-size]">
        <FocusReadout
          runtime={runtime}
          snapshot={snapshot ?? null}
          mode={activeMode}
          minutes={isCountdownMinutes(duration) ? duration : undefined}
        />
        <div
          role="status"
          className="space-y-1 text-center text-sm font-medium text-muted empty:-mt-4"
        >
          {running && snapshot && (
            <p className="sr-only">
              {t('focus.running', {
                phase:
                  activeMode === 'stopwatch'
                    ? t('focus.stopwatch')
                    : t(`focus.phase.${phaseType(snapshot.phase.index)}`),
              })}
            </p>
          )}
          {snapshot && observed.restoredId === snapshot.id && <p>{t('focus.restored')}</p>}
          {paused && <p>{t('focus.paused')}</p>}
          {snapshot?.phase.status === 'waiting' && (
            <p>
              {t('focus.waiting')}
              <span className="sr-only">
                {' '}
                {t('focus.nextPhase', {
                  phase: t(`focus.phase.${phaseType(snapshot.phase.index)}`),
                })}
              </span>
            </p>
          )}
          {(saving || finishing || busy === 'retry') && <p>{t('focus.saving')}</p>}
        </div>
        {!snapshot && mode === 'countdown' && (
          <>
            <div
              role="group"
              aria-label={t('focus.duration')}
              className="grid grid-cols-2 gap-2 [@container(min-width:24rem)]:grid-cols-4"
            >
              {[...presets, 'custom'].map((value) => (
                <Button
                  key={value}
                  aria-pressed={preset === value}
                  variant={preset === value ? 'primary' : 'secondary'}
                  className="min-w-0 px-2 [overflow-wrap:anywhere]"
                  onClick={() => {
                    setPreset(value)
                    setInvalid(false)
                  }}
                >
                  {value === 'custom' ? t('focus.custom') : t('focus.preset', { minutes: value })}
                </Button>
              ))}
            </div>
            {preset === 'custom' && (
              <Input
                ref={minutesField}
                label={t('focus.minutes')}
                type="number"
                inputMode="numeric"
                min={minMinutes}
                max={maxMinutes}
                step={1}
                value={minutes}
                error={invalid ? durationError : undefined}
                onChange={(event) => {
                  setMinutes(event.target.value)
                  setInvalid(false)
                }}
              />
            )}
          </>
        )}
        {!snapshot && <FocusAttachment />}
        {snapshot?.config.todo_id || snapshot?.config.schedule_item_id ? (
          <FocusAttachment active={snapshot.config} />
        ) : null}
        {activeMode === 'countdown' && (
          <Button
            variant="secondary"
            className="max-w-full self-center"
            aria-pressed={muted}
            onClick={() => setFocusSoundMuted(!muted)}
          >
            {muted && <CheckIcon className="size-5 shrink-0" />}
            {t('focus.muteSound')}
          </Button>
        )}
        <Button ref={primaryButton} type="submit" size="lg" fullWidth aria-disabled={Boolean(busy)}>
          {primaryLabel}
        </Button>
        {snapshot && (
          <div className="flex flex-wrap gap-2 [&>button]:min-w-11 [&>button]:max-w-full [&>button]:flex-auto [&>button]:px-3">
            {activeMode === 'stopwatch' && (
              <>
                <Button
                  variant="secondary"
                  aria-disabled={!running || Boolean(busy)}
                  onClick={() => {
                    if (running) run(() => runtime.command(snapshot, 'lap'))
                  }}
                >
                  {t('focus.lap')}
                </Button>
                <Button
                  variant="secondary"
                  aria-disabled={Boolean(busy)}
                  onClick={() => end('finish')}
                >
                  {t('focus.finish')}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              aria-disabled={Boolean(busy)}
              onClick={() => end('endEarly')}
            >
              {t('focus.endEarly')}
            </Button>
          </div>
        )}
      </Card>
      {actionError && (
        <p role="alert" className="text-sm text-danger">
          {t('focus.actionError')}
        </p>
      )}
      {(failed || rejected || retryable) && (
        <Card className="flex flex-col items-start gap-2">
          <div role="alert" className="space-y-1 text-sm text-danger">
            {failed && <p>{t('focus.saveStatusError')}</p>}
            {rejected && <p>{t('focus.rejected')}</p>}
            {retryable && <p>{t('focus.saveFailed')}</p>}
          </div>
          {retryable && (
            <Button
              variant="secondary"
              aria-disabled={Boolean(busy)}
              onClick={() => {
                if (busy) return
                restorePrimary.current = 'retry'
                run(() => runtime.retryPending(), 'retry')
              }}
            >
              {t('focus.retrySave')}
            </Button>
          )}
          {failed && (
            <Button variant="secondary" onClick={reload}>
              {t('focus.retry')}
            </Button>
          )}
        </Card>
      )}
      <MissingScheduleRecovery
        sessions={missingSchedules}
        busy={Boolean(busy)}
        onConfirm={(id) => {
          if (busy) return
          restorePrimary.current = { recoveringId: id }
          run(() => runtime.saveWithoutSchedule(id), 'retry')
        }}
      />
      {snapshot && snapshot.laps.length > 0 && <LapList laps={snapshot.laps} />}
    </form>
  )
}
