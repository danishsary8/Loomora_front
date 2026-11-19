import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import type { TimePreferences } from '@/lib/time/time'
import { useSaveGuestTimePreferences, useTimePreferences } from '@/lib/time/useTimePreferences'
import { PreferenceFields, PreferencesLoadStatus } from './PreferenceFields'

export function GuestPreferencesCard() {
  const { t } = useTranslation()
  const prefs = useTimePreferences()
  const save = useSaveGuestTimePreferences()
  const [draft, setDraft] = useState<Partial<TimePreferences>>({})
  const values = { ...prefs.values, ...draft }
  const formatChanged = values.time_format !== prefs.values.time_format
  const weekChanged = values.week_starts_on !== prefs.values.week_starts_on
  const changed = formatChanged || weekChanged

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!changed || save.pending || prefs.loading || prefs.failed) return
    save.mutate(
      {
        ...(formatChanged && { time_format: values.time_format }),
        ...(weekChanged && { week_starts_on: values.week_starts_on }),
      },
      { onSettled: () => setDraft({}) },
    )
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{t('profile.preferencesTitle')}</h2>
      {prefs.loading || prefs.failed ? (
        <PreferencesLoadStatus failed={prefs.failed} retry={prefs.retry} />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <PreferenceFields
            values={values}
            disabled={save.pending}
            onChange={(changes) => {
              save.reset()
              setDraft((current) => ({ ...current, ...changes }))
            }}
          />
          <FormError message={save.isError ? t('profile.preferencesSaveError') : undefined} />
          <Button type="submit" size="lg" fullWidth disabled={save.pending || !changed}>
            {t(save.pending ? 'profile.saving' : 'profile.saveSettings')}
          </Button>
          {save.isSuccess && !changed && (
            <p role="status" className="text-center font-semibold">
              {t('profile.saved')}
            </p>
          )}
        </form>
      )}
    </Card>
  )
}
