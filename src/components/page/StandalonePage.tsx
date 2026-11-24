import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Pages outside the app shell (landing, auth, legal, 404): no nav, centered column. */
export function StandalonePage({
  children,
  wide = false,
}: {
  children: ReactNode
  /** Room for a multi-column layout on wide screens (the landing page). */
  wide?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'mx-auto flex min-h-dvh w-full flex-col pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))]',
        wide ? 'max-w-4xl' : 'max-w-lg',
      )}
    >
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col gap-6 focus-visible:outline-none"
      >
        {children}
      </main>
      <footer className="mt-10 flex flex-wrap justify-center gap-2 text-sm">
        <Link to="/privacy" className="inline-flex min-h-touch items-center px-2 underline">
          {t('pages.privacy.title')}
        </Link>
        <Link to="/terms" className="inline-flex min-h-touch items-center px-2 underline">
          {t('pages.terms.title')}
        </Link>
      </footer>
    </div>
  )
}
