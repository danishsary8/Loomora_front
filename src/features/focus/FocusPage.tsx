import { useTranslation } from 'react-i18next'
import { ComingSoon } from '@/components/page'

export function FocusPage() {
  const { t } = useTranslation()
  return <ComingSoon title={t('pages.focus.title')} message={t('pages.focus.comingSoon')} />
}
