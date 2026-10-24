import { useTranslation } from 'react-i18next'

/** Skeleton shown while a screen loads (docs/05: skeleton, no splash). */
export function LoadingState() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 py-2">
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className="h-9 w-2/5 animate-pulse rounded-md bg-ink/10" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-16 animate-pulse rounded-lg border-thick border-ink/15 bg-paper"
        />
      ))}
    </div>
  )
}
