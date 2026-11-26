import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AppPageHeader } from '@/components/page'
import { Button, Card, Input, SegmentedControl } from '@/components/ui'
import { CheckIcon } from '@/components/ui/icons'
import { useSession } from '@/lib/api'
import { ExpandedFocus } from './ExpandedFocus'
import { FocusAlarmSettings } from './FocusAlarmSettings'
import { FocusAttachment } from './FocusAttachment'
import { FocusHistory } from './FocusHistory'
import { FocusReadout, LapList } from './FocusReadout'
import { MissingScheduleRecovery } from './MissingScheduleRecovery'
import { FocusRuntimeContext } from './focusRuntimeContext'
import type { FocusRuntime } from './focusRuntime'
import {
  isFocusSoundMuted,
  setFocusSoundMuted,
  subscribeToAlarmPreferences,
} from './focusAlarmPreferences'
import {
  customDurationLimits,
  isCountdownMinutes,
  maxLaps,
  phaseType,
  type TimerCommand,
  type TimerConfig,
} from './focusTimerState'
import { countdownPresetsMs, formatCentiseconds, getLap } from './timerMath'
import { useFocusSession } from './useFocusSession'
import { useRefreshFocusHistory } from './useFocusHistory'

const presets = Object.keys(countdownPresetsMs)
const [minMinutes, maxMinutes] = customDurationLimits
const subscribeToNoAlarm = () => () => undefined
const isNoAlarmActive = () => false

export function FocusPage() {
  const { t } = useTranslation()
  const runtime = useContext(FocusRuntimeContext)
  const generation = useSession((state) => state.generation)
  return (
    <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-4 [overflow-wrap:anywhere]">
      <AppPageHeader
        title={t('pages.focus.title')}
        headline={t('pages.focus.headline')}
        subtitle={t('pages.focus.tagline')}
      />
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
  const [expandedId, setExpandedId] = useState<string>()
  const expandButton = useRef<HTMLButtonElement>(null)
  const fullscreenSurface = useRef<HTMLDivElement>(null)
  const wasExpanded = useRef(false)
  const minutesField = useRef<HTMLInputElement>(null)
  const primaryButton = useRef<HTMLButtonElement>(null)
  const stopButton = useRef<HTMLButtonElement | null>(null)
  const trackStopButton = useCallback((button: HTMLButtonElement | null) => {
    if (!button && stopButton.current === document.activeElement) primaryButton.current?.focus()
    stopButton.current = button
  }, [])
  const restorePrimary = useRef<'end' | 'retry' | { recoveringId: string }>()
  const snapshot = observed?.snapshot
  const expanded = expandedId !== undefined && expandedId === snapshot?.id
  if (expandedId !== undefined && !expanded) setExpandedId(undefined)
  const closeExpanded = useCallback(() => setExpandedId(undefined), [])
  const running = snapshot?.phase.status === 'running'
  const paused = snapshot?.phase.status === 'paused'
  const activeMode = snapshot?.config.mode ?? mode
  const lapCount = snapshot?.laps.length ?? 0
  const lapLimitReached = lapCount >= maxLaps
  const lapLimitId = useId()
  // Announce only the lap this tab recorded, never restored laps or laps from another tab.
  const [lapRequest, setLapRequest] = useState<{ id: string; count: number }>()
  const newLap =
    snapshot && lapRequest?.id === snapshot.id && lapCount === lapRequest.count
      ? snapshot.laps.at(-1)
      : undefined
  // The 1000th-lap announcement already states the limit, so Lap describes it again only
  // after focus has left it.
  const [limitHeardId, setLimitHeardId] = useState<string>()
  const describeLapLimit =
    lapLimitReached && (newLap === undefined || limitHeardId === snapshot?.id)
  const muted = useSyncExternalStore(subscribeToAlarmPreferences, isFocusSoundMuted)
  const alarm = runtime.countdownSound
  const alarmActive = useSyncExternalStore(
    alarm?.subscribe ?? subscribeToNoAlarm,
    alarm?.isActive ?? isNoAlarmActive,
  )
  useLayoutEffect(() => alarm?.enterFocus(), [alarm])
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

  useLayoutEffect(() => {
    if (!expanded && wasExpanded.current) {
      const target =
        expandButton.current ?? primaryButton.current ?? document.getElementById('main')
      target?.focus()
    }
    wasExpanded.current = expanded
  }, [expanded])

  function openExpanded(event: MouseEvent<HTMLButtonElement>) {
    if (!snapshot) return
    // Fullscreen can consume the activation that the form normally uses to unlock audio.
    event.stopPropagation()
    if (snapshot.config.mode === 'countdown') alarm?.unlock()
    // Mount the surface while the click still grants transient user activation.
    flushSync(() => setExpandedId(snapshot.id))
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      void fullscreenSurface.current?.requestFullscreen?.().catch(() => {
        // The modal is already open as an in-app fallback.
      })
    }
  }

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

  const timerCard = (
    <Card className="flex min-w-0 flex-col gap-4 px-[min(1.5rem,3vw)] [container-type:inline-size]">
      <FocusReadout
        expanded={expanded}
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
        {snapshot && newLap !== undefined && (
          <p className="sr-only">
            {t('focus.lapRecorded', {
              count: lapCount,
              time: formatCentiseconds(getLap(snapshot.laps.at(-2) ?? 0, newLap).splitMs),
            })}
            {lapLimitReached && ` ${t('focus.lapLimit', { max: maxLaps })}`}
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
        {alarmActive && <p className="sr-only">{t('focus.alarm.active')}</p>}
        {(saving || finishing || busy === 'retry') && <p>{t('focus.saving')}</p>}
      </div>
      {!snapshot && mode === 'countdown' && (
        <>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-semibold">{t('focus.duration')}</legend>
            <div className="grid grid-cols-2 gap-2 [@container(min-width:24rem)]:grid-cols-4">
              {[...presets, 'custom'].map((value) => (
                <label key={value} className="relative min-w-0">
                  <input
                    type="radio"
                    name="countdown-duration"
                    value={value}
                    checked={preset === value}
                    className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                    onChange={() => {
                      setPreset(value)
                      setInvalid(false)
                    }}
                  />
                  <span className="flex h-full min-h-touch flex-wrap items-center justify-center gap-x-1 rounded-md border-control border-border-control bg-paper px-2 py-1 text-center text-sm font-semibold [overflow-wrap:anywhere] peer-hover:bg-subtle peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                    {preset === value && <CheckIcon className="size-4 shrink-0" />}
                    {value === 'custom' ? t('focus.custom') : t('focus.preset', { minutes: value })}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
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
        <FocusAttachment active={{ ...snapshot.config, startedAt: snapshot.startedAt }} />
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
      {alarmActive && (
        <Button
          variant="secondary"
          className="max-w-full self-center"
          ref={trackStopButton}
          onClick={() => alarm?.stop()}
        >
          {t('focus.alarm.stop')}
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
                aria-disabled={!running || Boolean(busy) || lapLimitReached}
                aria-describedby={describeLapLimit ? lapLimitId : undefined}
                onBlur={() => {
                  if (lapLimitReached && newLap !== undefined) setLimitHeardId(snapshot.id)
                }}
                onClick={() => {
                  if (!running || lapLimitReached) return
                  setLapRequest({ id: snapshot.id, count: lapCount + 1 })
                  run(() => runtime.command(snapshot, 'lap'))
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
          <Button variant="secondary" aria-disabled={Boolean(busy)} onClick={() => end('endEarly')}>
            {t('focus.endEarly')}
          </Button>
        </div>
      )}
      {activeMode === 'stopwatch' && lapLimitReached && (
        <p id={lapLimitId} className="text-center text-sm text-muted">
          {t('focus.lapLimit', { max: maxLaps })}
        </p>
      )}
    </Card>
  )
  const commandAlert = actionError && (
    <p role="alert" className="text-sm text-danger">
      {t('focus.actionError')}
    </p>
  )
  const lapList = snapshot && snapshot.laps.length > 0 && <LapList laps={snapshot.laps} />

  return (
    <form
      className="flex min-w-0 flex-col gap-4 [&_button[aria-disabled=true]]:cursor-not-allowed [&_button[aria-disabled=true]]:opacity-50"
      onClick={() => {
        if (activeMode === 'countdown') alarm?.unlock()
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
      {expanded ? (
        <ExpandedFocus surfaceRef={fullscreenSurface} onExit={closeExpanded}>
          {timerCard}
          {commandAlert}
          {lapList}
        </ExpandedFocus>
      ) : (
        <>
          {timerCard}
          {snapshot && (
            <Button
              ref={expandButton}
              variant="secondary"
              className="max-w-full self-center"
              aria-haspopup="dialog"
              onClick={openExpanded}
            >
              {t('focus.presentation.expand')}
            </Button>
          )}
          {commandAlert}
          {activeMode === 'countdown' && <FocusAlarmSettings />}
        </>
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
      {!expanded && lapList}
    </form>
  )
}
