import { useTranslation } from 'react-i18next'
import { ComingSoon } from '@/components/page'

export function InsightsPage() {
  const { t } = useTranslation()
  return <ComingSoon title={t('pages.insights.title')} message={t('pages.insights.comingSoon')} />
}
