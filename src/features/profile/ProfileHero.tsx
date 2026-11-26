import { ProfileIcon } from '@/components/ui/icons'

interface ProfileHeroProps {
  /** Level-1 screen title (e.g. "Profile") for navigation and assistive tech. */
  title: string
  /** Editorial display headline (e.g. "Your space."). */
  headline: string
  /** Supporting line describing guest or account mode. */
  subtitle: string
  /** Single uppercase user initial when signed in; falls back to ProfileIcon for guests. */
  initial?: string
}

/** Concept v3 soft green CSS-gradient hero band with centered avatar circle (no raster assets). */
export function ProfileHero({ title, headline, subtitle, initial }: ProfileHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-lg border-hairline border-primary/15 bg-gradient-to-b from-primary-soft via-category-health/60 to-paper px-5 pb-5 pt-6 text-center shadow-soft-sm">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-primary/10 blur-xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-accent/15 blur-xl"
      />
      <div className="relative flex flex-col items-center gap-2">
        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full border-2 border-paper bg-paper font-heading text-2xl font-bold text-primary shadow-soft-md"
        >
          {initial ? initial : <ProfileIcon className="h-icon-xl w-icon-xl" />}
        </div>
        <h1 className="text-sm font-semibold text-muted">{title}</h1>
        <p
          data-page-headline
          className="text-balance font-heading text-[2rem] font-bold leading-[1.1] tracking-tight text-ink [overflow-wrap:anywhere] md:text-[2.25rem]"
        >
          {headline}
        </p>
        <p className="max-w-md text-sm leading-relaxed text-muted">{subtitle}</p>
      </div>
    </header>
  )
}
