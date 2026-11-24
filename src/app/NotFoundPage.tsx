import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RecoveryPage } from '@/components/page'
import { buttonClasses } from '@/components/ui'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <RecoveryPage
      eyebrow={t('pages.notFound.code')}
      title={t('pages.notFound.title')}
      message={t('pages.notFound.message')}
      actions={
        <>
          <Link to="/today" className={buttonClasses({ as: 'link', size: 'lg', fullWidth: true })}>
            {t('pages.notFound.home')}
          </Link>
          <Link
            to="/"
            className={buttonClasses({ as: 'link', variant: 'secondary', fullWidth: true })}
          >
            {t('common.backHome')}
          </Link>
        </>
      }
    />
  )
}
