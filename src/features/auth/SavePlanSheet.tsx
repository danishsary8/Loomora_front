import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Sheet } from '@/components/ui'
import { useSavePlanIntent } from './savePlanIntent'

export interface SavePlanSheetProps {
  open: boolean
  onClose: () => void
}

const BENEFITS = ['benefitDevice', 'benefitSync', 'benefitStreak'] as const

/** S11 Save your plan: why an account helps, then on to Sign up (docs/04 Flow 3). */
export function SavePlanSheet({ open, onClose }: SavePlanSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const request = useSavePlanIntent((s) => s.request)

  function create() {
    request()
    onClose()
    navigate('/sign-up')
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('savePlan.title')}>
      <div className="flex flex-col gap-4">
        <p>{t('savePlan.intro')}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 font-semibold">
          {BENEFITS.map((key) => (
            <li key={key}>{t(`savePlan.${key}`)}</li>
          ))}
        </ul>
        <Button size="lg" fullWidth onClick={create}>
          {t('savePlan.create')}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
          {t('savePlan.notNow')}
        </Button>
      </div>
    </Sheet>
  )
}
