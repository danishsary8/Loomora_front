import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Hills } from '@/components/ui/Hills'
import { colors } from '@/styles/tokens'
import { BrandMark } from '@/components/ui/icons'

/** S10 and its follow-up screens: a split card, deep-green hills panel beside the form. */
export function AuthLayout({
  title,
  subtitle,
  links,
  children,
}: {
  title: string
  subtitle?: string | undefined
  /** Text links below the form, e.g. switching between sign in and sign up. */
  links?: ReactNode
  children: ReactNode
}) {
  return (
    <StandalonePage width="wide">
      <div className="flex flex-1 flex-col sm:justify-center sm:py-6">
        <div className="overflow-hidden rounded-lg border-hairline border-border-subtle bg-paper shadow-soft-md md:grid md:min-h-[38rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <AuthPanel />
          <div className="flex flex-col gap-5 px-5 pb-6 pt-6 sm:px-8 md:justify-center md:px-12 md:py-12">
            <header className="flex flex-col gap-2">
              <PageHeading>{title}</PageHeading>
              {subtitle && <p className="text-[15px] leading-relaxed text-muted">{subtitle}</p>}
            </header>
            <div className="flex flex-col gap-5">{children}</div>
            {links && (
              <nav className="flex flex-col items-center gap-1 border-t border-border-subtle pt-3 text-center">
                {links}
              </nav>
            )}
          </div>
        </div>
      </div>
    </StandalonePage>
  )
}

/** Brand side of the auth card: wordmark, one calm promise, and the hills motif. */
function AuthPanel() {
  const { t } = useTranslation()
  return (
    <div className="relative flex min-h-44 flex-col overflow-hidden bg-primary text-white md:min-h-0">
      <div className="relative z-10 flex flex-col gap-3 p-5 sm:p-7 md:p-10">
        <Link
          to="/"
          className="inline-flex min-h-touch items-center gap-2.5 self-start rounded-md font-heading text-xl font-bold"
        >
          <BrandMark className="size-9 rounded-sm" />
          <span>
            {t('common.appName')}
            <span aria-hidden="true" className="text-accent">
              .
            </span>
          </span>
        </Link>
        <p className="hidden max-w-xs font-heading text-[1.75rem] font-bold leading-tight tracking-tight md:block">
          {t('auth.panel.title')}
        </p>
        <p className="hidden max-w-xs text-[15px] leading-relaxed text-white/85 md:block">
          {t('auth.panel.body')}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-28 md:h-64">
        <Hills variant="forest" ground={colors.primaryPressed} />
      </div>
    </div>
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
