import type { ReactNode } from 'react'
import { PageHeading } from './PageHeading'
import { StandalonePage } from './StandalonePage'

/** S13 recovery screens (not found, router error): what happened, then clear next steps. */
export function RecoveryPage({
  eyebrow,
  title,
  message,
  alert = false,
  actions,
}: {
  eyebrow?: string
  title: string
  message: string
  /** Announce the message to screen readers as soon as the page appears. */
  alert?: boolean
  actions: ReactNode
}) {
  return (
    <StandalonePage>
      <div className="flex flex-1 flex-col justify-center gap-8 py-6 [overflow-wrap:anywhere]">
        <div className="flex flex-col gap-3">
          {eyebrow && <p className="text-sm font-semibold tracking-wide text-muted">{eyebrow}</p>}
          <PageHeading>{title}</PageHeading>
          <p
            role={alert ? 'alert' : undefined}
            className="max-w-prose text-lg leading-relaxed text-ink"
          >
            {message}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:max-w-sm">{actions}</div>
      </div>
    </StandalonePage>
  )
}
