import { cn } from '@/lib/cn'
import { colors } from '@/styles/tokens'

interface HillsProps {
  /** `light` sits on a pastel sky (Profile, empty states); `forest` on the deep-green brand panel. */
  variant?: 'light' | 'forest'
  /** Colour of the nearest hill, so the scene melts into the surface below it. */
  ground?: string
  className?: string
}

const PALETTES = {
  light: { far: colors.primaryLight, farOpacity: 0.28, mid: colors.primary, midOpacity: 0.42 },
  forest: {
    far: colors.category.health,
    farOpacity: 0.22,
    mid: colors.primaryLight,
    midOpacity: 0.9,
  },
} as const

/** Signature motif from Concept v3: layered green hills under a low peach sun. Decorative only. */
export function Hills({ variant = 'light', ground = colors.paper, className }: HillsProps) {
  const palette = PALETTES[variant]
  return (
    <svg
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none block h-full w-full', className)}
    >
      <circle
        cx="318"
        cy="70"
        r="22"
        fill={colors.accent}
        opacity={variant === 'forest' ? 0.95 : 0.6}
      />
      <path
        d="M0 100 Q90 52 200 92 T400 78 L400 160 L0 160 Z"
        fill={palette.far}
        opacity={palette.farOpacity}
      />
      <path
        d="M0 122 Q120 78 250 112 T400 100 L400 160 L0 160 Z"
        fill={palette.mid}
        opacity={palette.midOpacity}
      />
      <path d="M70 118 q6 -16 0 -26 q-8 12 0 26 Z" fill={colors.category.health} opacity="0.85" />
      <path d="M82 120 q10 -12 8 -24 q-12 8 -8 24 Z" fill={colors.category.health} opacity="0.6" />
      <path d="M0 140 Q160 116 300 136 T400 130 L400 160 L0 160 Z" fill={ground} />
    </svg>
  )
}
