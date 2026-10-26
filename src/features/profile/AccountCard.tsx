import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { deviceTimeZone, timeZoneOptions } from '@/features/auth/timezone'
import { useFormAction } from '@/features/auth/useFormAction'
import { authApi, useSession, type User } from '@/lib/api'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

/** Name and time zone of the signed-in user (PATCH /me), plus where the email is shown. */
export function AccountCard({ user }: { user: User }) {
  const { t } = useTranslation()
  const setUser = useSession((s) => s.setUser)
  const { pending, formError, fieldErrors, run } = useFormAction()
  const [name, setName] = useState(user.name)
  const [timezone, setTimezone] = useState(user.timezone)
  const [saved, setSaved] = useState(false)
  const device = deviceTimeZone()

  const trimmed = name.trim()
  const changed = trimmed !== user.name || timezone !== user.timezone

  function submit(event: FormEvent) {
    event.preventDefault()
    setSaved(false)
    void run(async () => {
      setUser(await authApi.updateMe({ name: trimmed, timezone }))
      setSaved(true)
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">{t('profile.accountTitle')}</h2>
      <p className="text-sm text-muted">{user.email}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <Input
          label={t('profile.name')}
          autoComplete="name"
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
          <Button variant="ghost" onClick={() => setTimezone(device)}>
            {t('profile.useDeviceTimeZone', { zone: device })}
          </Button>
        )}
        <Button type="submit" size="lg" fullWidth disabled={pending || !changed || trimmed === ''}>
          {t(pending ? 'profile.saving' : 'profile.save')}
        </Button>
        {saved && !changed && (
          <p role="status" className="text-center font-semibold">
            {t('profile.saved')}
          </p>
        )}
      </form>
    </Card>
  )
}
