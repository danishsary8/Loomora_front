// Single source for Elemental Edition design tokens (DEC-003). Tailwind reads these in tailwind.config.ts.

export const CATEGORIES = ['study', 'work', 'health', 'life', 'rest', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const colors = {
  // Warm ivory canvas and elevated surfaces (DEC-003).
  cream: '#F7F5EF',
  paper: '#FCFBF8',
  subtle: '#EFECE3',
  white: '#FFFFFF',
  // Forest ink and muted supporting text.
  ink: '#132A23',
  muted: '#54685B',
  // Deep forest brand primary and soft tint.
  primary: '#1D5039',
  primaryPressed: '#194631',
  primarySoft: '#E6F0EB',
  // Restrained terracotta accent — pair ONLY with `ink` (#132A23) foreground.
  accent: '#E99A63',
  // Split borders for WCAG 2.2 SC 1.4.11: decorative hairline vs >= 3:1 interactive control border.
  borderSubtle: '#E1E8E1',
  borderControl: '#7B8C82',
  // Semantic status colors (kept distinct from category colors).
  success: '#18703F',
  warning: '#9A5B04',
  warningSurface: '#FEF4E4',
  danger: '#C62F36',
  // Preserved documented category hexes pending reconciliation of provisional pastel hexes
  // against the original Elemental reference assets (LOOMORA_ELEMENTAL_* / LOOMORA_PREMIUM_*).
  category: {
    study: '#8EC5FF',
    work: '#FFD166',
    health: '#7ED9A6',
    life: '#FF9EBB',
    rest: '#C3B1FF',
    other: '#E3D7C9',
  } satisfies Record<Category, string>,
} as const

export const borderWidth = {
  hairline: '1px',
  control: '1.5px',
  thin: '2px',
  thick: '3px',
} as const

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '22px',
} as const

// Soft ambient elevation for Elemental Edition surfaces (DEC-003).
export const elevation = {
  sm: '0 1px 2px rgba(19, 42, 35, 0.06)',
  md: '0 4px 12px rgba(19, 42, 35, 0.08)',
  sheet: '0 -8px 24px rgba(19, 42, 35, 0.12)',
} as const

// Legacy hard offset shadows retained only until UX-004 migrates shared UI primitives.
export const shadowOffset = {
  sm: 2,
  md: 4,
  lg: 6,
} as const

export const shadow = Object.fromEntries(
  Object.entries(shadowOffset).map(([name, px]) => [name, `${px}px ${px}px 0 0 ${colors.ink}`]),
) as Record<keyof typeof shadowOffset, string>

export const motion = {
  duration: {
    fast: '160ms',
    base: '200ms',
    slow: '240ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const

const INTER_STACK = ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] as const

export const fontFamily = {
  heading: INTER_STACK,
  body: INTER_STACK,
} as const

/** WCAG 2.1 relative luminance of a #RRGGBB color. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio between two #RRGGBB colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
