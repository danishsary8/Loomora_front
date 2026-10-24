// Single source for design tokens (DEC-002). Tailwind reads these in tailwind.config.ts.

export const CATEGORIES = ['study', 'work', 'health', 'life', 'rest', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const colors = {
  cream: '#F5EDE6',
  paper: '#FFFFFF',
  ink: '#111111',
  muted: '#5C5249',
  accent: '#FF8A3D',
  success: '#18703F',
  danger: '#C62F36',
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
  thin: '2px',
  thick: '3px',
} as const

export const radius = {
  sm: '6px',
  md: '12px',
  lg: '20px',
} as const

// Hard offset shadows: no blur, always ink.
export const shadowOffset = {
  sm: 2,
  md: 4,
  lg: 6,
} as const

export const shadow = Object.fromEntries(
  Object.entries(shadowOffset).map(([name, px]) => [name, `${px}px ${px}px 0 0 ${colors.ink}`]),
) as Record<keyof typeof shadowOffset, string>

export const fontFamily = {
  script: ['"Caveat Variable"', 'Caveat', 'cursive'],
  body: ['"Space Grotesk Variable"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
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
