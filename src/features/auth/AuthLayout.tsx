import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Card } from '@/components/ui'
import { BrandMark } from '@/components/ui/icons'

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
      <div className="flex flex-1 flex-col gap-5 sm:justify-center sm:py-8">
        <header className="flex flex-col gap-2">
          <BrandMark className="mb-1 size-9 rounded-sm shadow-soft-sm" />
          <PageHeading>{title}</PageHeading>
          {subtitle && <p className="text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </header>
        <Card className="flex flex-col gap-5 p-5 shadow-soft-md sm:p-7">{children}</Card>
        {links && <nav className="flex flex-col items-center gap-1 pt-1 text-center">{links}</nav>}
      </div>
    </StandalonePage>
  )
}

/** A text link styled the same on every auth screen, with a 44 px target. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-touch items-center text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors duration-fast ease-elemental [overflow-wrap:anywhere] hover:text-primary-pressed hover:decoration-primary"
    >
      {children}
    </Link>
  )
}

/** The hairline "or" between Google and the email form. */
export function AuthDivider() {
  const { t } = useTranslation()
  return (
    <div role="separator" aria-label={t('auth.or')} className="my-0.5 flex items-center gap-3.5">
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
      <span aria-hidden="true" className="text-xs font-medium text-muted">
        {t('auth.or')}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
    </div>
  )
}
