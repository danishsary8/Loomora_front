import { ProfileIcon } from '@/components/ui/icons'
import { colors } from '@/styles/tokens'

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
        className="relative h-28 w-full overflow-hidden bg-gradient-to-b from-category-study/75 via-primary-soft to-category-health"
      >
        <svg
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <circle cx="332" cy="28" r="14" fill={colors.accent} opacity="0.55" />
          <path
            d="M0 78 Q95 36 205 70 T400 58 L400 120 L0 120 Z"
            fill={colors.primaryLight}
            opacity="0.32"
          />
          <path
            d="M0 94 Q120 56 245 86 T400 76 L400 120 L0 120 Z"
            fill={colors.primary}
            opacity="0.45"
          />
          <path d="M0 106 Q160 88 300 104 T400 98 L400 120 L0 120 Z" fill={colors.paper} />
        </svg>
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
