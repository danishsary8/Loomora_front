import { useIsMutating, useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnsavedDraft } from '@/app/pwaUpdate'
import { Button, Card, Input } from '@/components/ui'
import { ResendVerification } from '@/features/auth/ResendVerification'
import { FormError } from '@/features/auth/FormError'
import { deviceTimeZone, timeZoneOptions } from '@/features/auth/timezone'
import { useFormAction } from '@/features/auth/useFormAction'
import { authApi, useSession, type User } from '@/lib/api'
import type { UpdateMeInput } from '@/lib/api/types'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { TimePreferences } from '@/lib/time/time'
import { useTimePreferences } from '@/lib/time/useTimePreferences'
import { PreferenceFields, PreferencesLoadStatus, SavedStatus } from './PreferenceFields'

/** Account identity, time zone and display settings (PATCH /me). */
export function AccountCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const generation = useSession((s) => s.generation)
  const mutationKey = ['profile', generation]
  const { pending, formError, fieldErrors, run } = useFormAction()
  const saving = useIsMutating({ mutationKey }) > 0 || pending
  const save = useMutation({
    mutationKey,
    networkMode: 'always',
    mutationFn: (input: UpdateMeInput) => {
      if (useSession.getState().generation !== generation) throw new Error('Session changed')
      return authApi.updateMe(input)
    },
  })
  const prefs = useTimePreferences()
  const [draft, setDraft] = useState<Partial<TimePreferences>>({})
  const values = { ...prefs.values, ...draft }
  const [nameDraft, setName] = useState<string>()
  const [zoneDraft, setTimezone] = useState<string>()
  const name = nameDraft ?? user.name
  const timezone = zoneDraft ?? user.timezone
  const [saved, setSaved] = useState(false)
  const device = deviceTimeZone()

  const trimmed = name.trim()
  const changed =
    trimmed !== user.name ||
    timezone !== user.timezone ||
    values.time_format !== prefs.values.time_format ||
    values.week_starts_on !== prefs.values.week_starts_on
  useUnsavedDraft('account-card', changed || saving)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!changed || saving || prefs.loading || !trimmed) return
    setSaved(false)
    void run(async () => {
      try {
        const updated = await save.mutateAsync({
          ...(trimmed !== user.name && { name: trimmed }),
          ...(timezone !== user.timezone && { timezone }),
          ...(values.time_format !== prefs.values.time_format && {
            time_format: values.time_format,
          }),
          ...(values.week_starts_on !== prefs.values.week_starts_on && {
            week_starts_on: values.week_starts_on,
          }),
        })
        const current = useSession.getState()
        if (current.generation !== generation || current.user?.id !== updated.id) return
        current.setUser({ ...current.user, ...updated })
        setName(undefined)
        setTimezone(undefined)
        setSaved(true)
      } finally {
        setDraft({})
      }
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-lg font-semibold tracking-tight">{t('profile.accountTitle')}</h2>
        <p className="text-sm text-muted [overflow-wrap:anywhere]">{user.email}</p>
      </div>
      {user.email_verified_at === null && (
        <div className="flex flex-col gap-3 rounded-md border-hairline border-warning/30 bg-warning-surface p-3">
          <p className="text-sm font-semibold text-ink">{t('profile.emailNotConfirmed')}</p>
          <ResendVerification />
        </div>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <Input
          label={t('profile.name')}
          autoComplete="name"
          disabled={saving}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
        <Field
          label={t('profile.timeZone')}
          hint={t('profile.timeZoneHint')}
          error={fieldErrors.timezone}
        >
          {(field) => (
            <select
              {...field}
              className={cn('min-h-touch', fieldClasses(fieldErrors.timezone))}
              disabled={saving}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timeZoneOptions(user.timezone, device).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          )}
        </Field>
        {timezone !== device && (
          <Button
            variant="ghost"
            className="-mt-2 self-start px-3 text-left text-primary [overflow-wrap:anywhere]"
            disabled={saving}
            onClick={() => setTimezone(device)}
          >
            {t('profile.useDeviceTimeZone', { zone: device })}
          </Button>
        )}
        <fieldset className="flex min-w-0 flex-col gap-4 border-t border-border-subtle pt-4">
          <legend className="float-left w-full text-base font-semibold text-ink">
            {t('profile.preferencesTitle')}
          </legend>
          {prefs.loading || prefs.failed ? (
            <PreferencesLoadStatus failed={prefs.failed} retry={prefs.retry} />
          ) : (
            <PreferenceFields
              values={values}
              disabled={saving}
              errors={fieldErrors}
              onChange={(changes) => {
                setSaved(false)
                setDraft((current) => ({ ...current, ...changes }))
              }}
            />
          )}
        </fieldset>
        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={saving || prefs.loading || !changed || trimmed === ''}
        >
          {t(saving ? 'profile.saving' : 'profile.save')}
        </Button>
        {saved && !changed && <SavedStatus />}
      </form>
    </Card>
  )
}
