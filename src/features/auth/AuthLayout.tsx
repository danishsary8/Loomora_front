import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Card } from '@/components/ui'

/** S10 and its follow-up screens: heading and subtitle, the form on a paper card, then links. */
export function AuthLayout({
  title,
  subtitle,
  links,
  children,
}: {
  title: string
  subtitle?: string | undefined
  /** Text links below the card, e.g. switching between sign in and sign up. */
  links?: ReactNode
  children: ReactNode
}) {
  return (
    <StandalonePage>
      <div className="flex flex-1 flex-col gap-6 sm:justify-center sm:py-6">
        <header className="flex flex-col gap-2">
          <PageHeading>{title}</PageHeading>
          {subtitle && <p className="text-base leading-relaxed text-muted">{subtitle}</p>}
        </header>
        <Card className="flex flex-col gap-5 sm:p-6">{children}</Card>
        {links && <nav className="flex flex-col items-center gap-1 text-center">{links}</nav>}
      </div>
    </StandalonePage>
  )
}

/** A text link styled the same on every auth screen, with a 44 px target. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-touch items-center font-semibold text-primary underline underline-offset-4 [overflow-wrap:anywhere] hover:text-primary-pressed"
    >
      {children}
    </Link>
  )
}

/** The hairline "or" between Google and the email form. */
export function AuthDivider() {
  const { t } = useTranslation()
  return (
    <div role="separator" aria-label={t('auth.or')} className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
      <span aria-hidden="true" className="text-sm font-semibold text-muted">
        {t('auth.or')}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
    </div>
  )
}
