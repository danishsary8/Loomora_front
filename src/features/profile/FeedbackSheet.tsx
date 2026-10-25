import { useTranslation } from 'react-i18next'
import { Button, Sheet, Textarea } from '@/components/ui'

export interface FeedbackSheetProps {
  open: boolean
  onClose: () => void
}

/** S12 Feedback (UI only): sending arrives with the account and API tasks. */
export function FeedbackSheet({ open, onClose }: FeedbackSheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onClose={onClose} title={t('profile.feedbackTitle')}>
      <div className="flex flex-col gap-4">
        <Textarea
          label={t('profile.feedbackMessage')}
          hint={t('profile.feedbackHint')}
          maxLength={1000}
        />
        <Button size="lg" fullWidth disabled aria-describedby="feedback-soon">
          {t('profile.feedbackSend')}
        </Button>
        <p id="feedback-soon" className="text-center text-sm text-muted">
          {t('profile.feedbackSoon')}
        </p>
      </div>
    </Sheet>
  )
}
