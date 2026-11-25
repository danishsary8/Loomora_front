import { useId, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { Field } from '@/components/ui/Field'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { ChevronDownIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import {
  alarmModes,
  alarmSounds,
  alarmVolumeStep,
  getAlarmPreferences,
  setAlarmPreferences,
  subscribeToAlarmPreferences,
} from './focusAlarmPreferences'

export function FocusAlarmSettings() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { sound, volume, mode } = useSyncExternalStore(
    subscribeToAlarmPreferences,
    getAlarmPreferences,
  )
  const volumeText = t('focus.alarm.volumeValue', { volume })
  const summary = t('focus.alarm.summary', {
    sound: t(`focus.alarm.sounds.${sound}`),
    volume: volumeText,
    mode: t(`focus.alarm.modes.${mode}`),
  })
  const selectClasses = fieldClasses() + ' min-h-touch'

  return (
    <Card compact className="min-w-0 px-[min(1rem,3vw)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-touch w-full items-center justify-between gap-3 rounded-sm text-left text-ink transition-colors duration-fast ease-elemental hover:text-primary"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{t('focus.alarm.title')}</span>
          <span className="truncate text-xs font-medium tabular-nums text-muted">{summary}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-muted transition-transform duration-fast ease-elemental motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <fieldset
          id={panelId}
          className="mt-3 min-w-0 space-y-3 border-t-hairline border-border-subtle pt-3"
        >
          <legend className="sr-only">{t('focus.alarm.title')}</legend>
          <Field label={t('focus.alarm.sound')}>
            {(field) => (
              <select
                {...field}
                className={selectClasses}
                value={sound}
                onChange={(event) =>
                  setAlarmPreferences({ sound: event.target.value as typeof sound })
                }
              >
                {alarmSounds.map((value) => (
                  <option key={value} value={value}>
                    {t(`focus.alarm.sounds.${value}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('focus.alarm.volume')}>
            {(field) => (
              <div className="flex flex-wrap items-center gap-x-3">
                <input
                  {...field}
                  className="m-0 min-h-touch min-w-0 flex-1 basis-24 accent-primary"
                  type="range"
                  min={0}
                  max={100}
                  step={alarmVolumeStep}
                  value={volume}
                  aria-valuetext={volumeText}
                  onChange={(event) => setAlarmPreferences({ volume: event.target.valueAsNumber })}
                />
                <span className="text-sm tabular-nums text-muted" aria-hidden="true">
                  {volumeText}
                </span>
              </div>
            )}
          </Field>
          <Field label={t('focus.alarm.mode')} hint={t('focus.alarm.limit')}>
            {(field) => (
              <select
                {...field}
                className={selectClasses}
                value={mode}
                onChange={(event) =>
                  setAlarmPreferences({ mode: event.target.value as typeof mode })
                }
              >
                {alarmModes.map((value) => (
                  <option key={value} value={value}>
                    {t(`focus.alarm.modes.${value}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </fieldset>
      )}
    </Card>
  )
}
