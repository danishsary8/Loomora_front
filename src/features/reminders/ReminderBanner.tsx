import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { SNOOZE_MINUTES, type SnoozeMinutes } from '@/features/todos/types'

export type ReminderAction = 'done' | 'dismiss' | SnoozeMinutes

interface ReminderBannerProps {
  title: string
  busy: boolean
  error?: string
  onAction: (action: ReminderAction) => void
}

export function ReminderBanner({ title, busy, error, onAction }: ReminderBannerProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const snooze = useRef<HTMLButtonElement>(null)
  const firstOption = useRef<HTMLButtonElement>(null)
  const optionsId = useId()

  useEffect(() => {
    if (expanded) firstOption.current?.focus()
  }, [expanded])

  function closeOptions() {
    setExpanded(false)
    snooze.current?.focus()
  }

  return (
    <section aria-label={t('reminders.label')} className="mx-auto w-full max-w-2xl px-4 pb-2 pt-3">
      <Card compact className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="break-words text-base font-bold">
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button aria-disabled={busy} onClick={() => onAction('done')}>
            {t('reminders.done')}
          </Button>
          <Button
            ref={snooze}
            variant="secondary"
            aria-controls={optionsId}
            aria-expanded={expanded}
            aria-disabled={busy}
            onClick={() => {
              if (busy) return
              if (expanded) closeOptions()
              else setExpanded(true)
            }}
          >
            {t('reminders.snooze')}
          </Button>
          <Button variant="ghost" aria-disabled={busy} onClick={() => onAction('dismiss')}>
            {t('reminders.dismiss')}
          </Button>
        </div>
        <div
          id={optionsId}
          hidden={!expanded}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !busy) {
              event.stopPropagation()
              closeOptions()
            }
          }}
        >
          <div role="group" aria-label={t('reminders.snoozeFor')} className="flex flex-wrap gap-2">
            {SNOOZE_MINUTES.map((minutes, index) => (
              <Button
                key={minutes}
                ref={index === 0 ? firstOption : undefined}
                variant="secondary"
                aria-disabled={busy}
                onClick={() => onAction(minutes)}
              >
                {t('reminders.minutes', { count: minutes })}
              </Button>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
      </Card>
    </section>
  )
}
