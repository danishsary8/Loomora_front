import { ProfileIcon } from '@/components/ui/icons'
import { Hills } from '@/components/ui/Hills'

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

/** Concept v3 soft green hero band with decorative token-colored hills and centered avatar circle. */
export function ProfileHero({ title, headline, subtitle, initial }: ProfileHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-lg border-hairline border-primary/15 bg-paper text-center shadow-soft-sm">
      <div
        aria-hidden="true"
        className="relative h-32 w-full overflow-hidden bg-gradient-to-b from-category-study/75 via-primary-soft to-category-health"
      >
        <Hills className="absolute inset-0" />
      </div>
      <div className="relative -mt-12 flex flex-col items-center gap-1.5 px-5 pb-5">
        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full border-4 border-paper bg-primary-soft font-heading text-2xl font-bold text-primary shadow-soft-md"
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
