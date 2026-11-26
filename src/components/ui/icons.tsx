import type { SVGProps } from 'react'

// Unified Elemental Edition icon system (DEC-003): 1.75 px stroke, round caps & joins.
// Decorative icons: callers provide the accessible name, so these are aria-hidden.
function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </IconBase>
  )
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </IconBase>
  )
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  )
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m15 5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z" />
    </IconBase>
  )
}

export function RepeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3" />
    </IconBase>
  )
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </IconBase>
  )
}

export function TodayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconBase>
  )
}

export function WeekIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </IconBase>
  )
}

export function FocusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M10 2h4" />
    </IconBase>
  )
}

export function InsightsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </IconBase>
  )
}

export function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </IconBase>
  )
}

export function StreakIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-6 1 1 1 2 2 2 1-2 1-5 1-8Z" />
    </IconBase>
  )
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </IconBase>
  )
}

/** Elemental forest "L" brand mark matching public/icon.svg (decorative; caller names the brand). */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" {...props}>
      <rect x="24" y="24" width="464" height="464" rx="112" fill="#1D5039" />
      <rect
        x="27"
        y="27"
        width="458"
        height="458"
        rx="109"
        fill="none"
        stroke="#FCFBF8"
        strokeOpacity="0.14"
        strokeWidth="6"
      />
      <path d="M174 132h68v184h108v64H174z" fill="#F7F5EF" />
    </svg>
  )
}

/** Standard decorative Google "G" mark for the Google OAuth button. */
export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M21.8 12.23c0-.72-.06-1.42-.19-2.09H12v3.96h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.51Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.76 0 5.07-.91 6.76-2.46l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.91-1.8-5.72-4.21H2.87v2.64A10.22 10.22 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.28 13.75a6.12 6.12 0 0 1 0-3.9V7.21H2.87a10.22 10.22 0 0 0 0 9.18l3.41-2.64Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.64c1.5 0 2.84.52 3.9 1.53l2.93-2.93C17.06 2.61 14.76 1.6 12 1.6a10.22 10.22 0 0 0-9.13 5.61l3.41 2.64C7.09 7.44 9.34 5.64 12 5.64Z"
      />
    </svg>
  )
}

/** Notes document icon in the unified 1.75 px Elemental stroke style. */
export function NotesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M15 3v4h4" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  )
}

// Category glyphs (concept v3): one outline icon per documented category.
export function StudyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
      <path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5" />
    </IconBase>
  )
}

export function WorkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
    </IconBase>
  )
}

export function HealthIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" />
    </IconBase>
  )
}

export function LifeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 11 12 4.5 20 11" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  )
}

export function RestIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />
    </IconBase>
  )
}

export function OtherIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8.6-7.4Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </IconBase>
  )
}

export const CATEGORY_ICONS = {
  study: StudyIcon,
  work: WorkIcon,
  health: HealthIcon,
  life: LifeIcon,
  rest: RestIcon,
  other: OtherIcon,
} as const

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4.5 20l1.4-4.1A7.5 7.5 0 1 1 20 12Z" />
    </IconBase>
  )
}

export function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M14 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H14" />
      <path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
    </IconBase>
  )
}
