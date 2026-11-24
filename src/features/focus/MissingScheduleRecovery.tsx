import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Sheet } from '@/components/ui'
import { useSession } from '@/lib/api'
import type { PendingFocusSave } from './focusRuntime'

interface Props {
  sessions: PendingFocusSave[]
  busy: boolean
  onConfirm: (id: string) => void
}

export function MissingScheduleRecovery({ sessions, busy, onConfirm }: Props) {
  const { t, i18n } = useTranslation()
  const zone = useSession((state) => state.user?.timezone)
  const [selectedId, setSelectedId] = useState<string>()
  const cancel = useRef<HTMLButtonElement>(null)
  const selected = sessions.find((session) => session.id === selectedId)
  const action = t('focus.saveWithoutSchedule')
  const close = () => setSelectedId(undefined)

  if (!sessions.length && !selectedId) return null

  const formatStartedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone,
  })

  return (
    <>
      {sessions.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p role="alert" className="text-sm text-danger">
            {t('focus.missingSchedule')}
          </p>
          <ul className="flex flex-col gap-3">
            {sessions.map(({ id, payload }) => (
              <li key={id} className="flex flex-col items-start gap-2">
                <p id={'focus-recovery-' + id} className="text-sm text-muted">
                  {t('focus.sessionStartedAt', {
                    time: formatStartedAt.format(new Date(payload.started_at)),
                  })}
                </p>
                <Button
                  variant="secondary"
                  aria-describedby={'focus-recovery-' + id}
                  aria-disabled={busy}
                  onClick={() => {
                    if (!busy) setSelectedId(id)
                  }}
                >
                  {action}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Sheet open={Boolean(selected)} onClose={close} title={action} initialFocusRef={cancel}>
        <p className="text-sm text-muted">{t('focus.confirmWithoutSchedule')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button ref={cancel} variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (!selected || busy) return
              close()
              onConfirm(selected.id)
            }}
          >
            {action}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
