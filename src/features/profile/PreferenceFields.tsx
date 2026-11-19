import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { Field } from '@/components/ui/Field'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { cn } from '@/lib/cn'
import type { FieldErrors } from '@/lib/api'
import type { TimePreferences } from '@/lib/time/time'

interface PreferenceFieldsProps {
  values: TimePreferences
  onChange: (changes: Partial<TimePreferences>) => void
  disabled: boolean
  errors?: FieldErrors
}

export function PreferenceFields({ values, onChange, disabled, errors }: PreferenceFieldsProps) {
  const { t } = useTranslation()
  const start = values.week_starts_on
  const savedWeekday = (start - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6

  return (
    <>
      <Field label={t('profile.timeFormat')} error={errors?.time_format}>
        {(field) => (
          <select
            {...field}
            className={cn('min-h-touch', fieldClasses(errors?.time_format))}
            disabled={disabled}
            value={values.time_format}
            onChange={(event) =>
              onChange({ time_format: event.target.value === '12h' ? '12h' : '24h' })
            }
          >
            <option value="12h">{t('profile.clock12')}</option>
            <option value="24h">{t('profile.clock24')}</option>
          </select>
        )}
      </Field>
      <Field label={t('profile.weekStart')} error={errors?.week_starts_on}>
        {(field) => (
          <select
            {...field}
            className={cn('min-h-touch', fieldClasses(errors?.week_starts_on))}
            disabled={disabled}
            value={start}
            onChange={(event) => onChange({ week_starts_on: event.target.value === '7' ? 7 : 1 })}
          >
            {start !== 1 && start !== 7 && (
              <option value={start} disabled>
                {t(`weekdays.long.${savedWeekday}`)}
              </option>
            )}
            <option value="1">{t('weekdays.long.0')}</option>
            <option value="7">{t('weekdays.long.6')}</option>
          </select>
        )}
      </Field>
    </>
  )
}

export function PreferencesLoadStatus({ failed, retry }: { failed: boolean; retry: () => void }) {
  const { t } = useTranslation()
  return failed ? (
    <div className="flex flex-col gap-2">
      <p role="alert" className="text-sm font-semibold text-danger">
        {t('profile.preferencesLoadError')}
      </p>
      <Button variant="secondary" onClick={retry}>
        {t('common.retry')}
      </Button>
    </div>
  ) : (
    <p role="status" className="text-sm text-muted">
      {t('common.loading')}
    </p>
  )
}
