import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { Field } from '@/components/ui/Field'
import { fieldClasses } from '@/components/ui/fieldClasses'
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
  const { sound, volume, mode } = useSyncExternalStore(
    subscribeToAlarmPreferences,
    getAlarmPreferences,
  )
  const volumeText = t('focus.alarm.volumeValue', { volume })
  const selectClasses = fieldClasses() + ' min-h-touch'

  return (
    <Card className="min-w-0 px-[min(1rem,3vw)]">
      <fieldset className="min-w-0 space-y-3">
        <legend className="mb-3 font-semibold">{t('focus.alarm.title')}</legend>
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
              onChange={(event) => setAlarmPreferences({ mode: event.target.value as typeof mode })}
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
    </Card>
  )
}
