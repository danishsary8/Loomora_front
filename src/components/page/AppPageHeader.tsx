import type { ReactNode } from 'react'

/**
 * Elemental screen header (concept v3): the screen name stays the level-1 heading for
 * navigation and assistive tech; the editorial headline carries the visual weight.
 */
export function AppPageHeader({
  title,
  headline,
  subtitle,
  aside,
}: {
  title: string
  headline: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
      <div className="flex min-w-[min(100%,12rem)] flex-1 flex-col gap-1.5">
        <h1 className="text-sm font-semibold text-muted">{title}</h1>
        <p
          data-page-headline
          className="text-balance font-heading text-[2rem] font-bold leading-[1.1] tracking-tight text-ink [overflow-wrap:anywhere] md:text-[2.5rem]"
        >
          {headline}
        </p>
        {subtitle && <div className="text-sm leading-relaxed text-muted">{subtitle}</div>}
      </div>
      {aside && <div className="min-w-0 max-w-full">{aside}</div>}
    </header>
  )
}
