import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Sheet, Textarea } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { accountDataApi, ApiError } from '@/lib/api'

export interface FeedbackSheetProps {
  open: boolean
  onClose: () => void
}

/** S12 Feedback: sends the message (POST /feedback), for guests and accounts. */
export function FeedbackSheet({ open, onClose }: FeedbackSheetProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const send = useMutation({ mutationFn: accountDataApi.sendFeedback })

  function close() {
    onClose()
    setMessage('')
    send.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (message.trim()) send.mutate(message.trim())
  }

  const error = send.error
  const failure = !error
    ? undefined
    : error instanceof ApiError && error.isRateLimited
      ? t('profile.feedbackRateLimited')
      : t('profile.feedbackFailed')

  return (
    <Sheet open={open} onClose={close} title={t('profile.feedbackTitle')}>
      {send.isSuccess ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="font-semibold">
            {t('profile.feedbackThanks')}
          </p>
          <Button size="lg" fullWidth onClick={close}>
            {t('common.close')}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormError message={failure} />
          <Textarea
            label={t('profile.feedbackMessage')}
            hint={t('profile.feedbackHint')}
            maxLength={5000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={send.isPending || message.trim() === ''}
          >
            {t(send.isPending ? 'profile.feedbackSending' : 'profile.feedbackSend')}
          </Button>
        </form>
      )}
    </Sheet>
  )
}
