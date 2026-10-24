import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { buttonClasses, Card } from '@/components/ui'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <StandalonePage>
      <PageHeading>{t('pages.notFound.title')}</PageHeading>
      <Card className="flex flex-col gap-4">
        <p>{t('pages.notFound.message')}</p>
        <Link to="/today" className={buttonClasses({ as: 'link', fullWidth: true })}>
          {t('pages.notFound.home')}
        </Link>
      </Card>
    </StandalonePage>
  )
}
