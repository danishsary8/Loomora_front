import { CATEGORIES, colors, contrastRatio, fontFamily, motion, radius } from './tokens'

const AA_TEXT = 4.5
const AA_NON_TEXT = 3.0

describe('Elemental Edition design tokens (DEC-003)', () => {
  it('computes known contrast ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  // Every text/background pair used by Elemental Edition and existing components.
  const textPairs: [string, string, string][] = [
    ['ink on canvas (cream)', colors.ink, colors.cream],
    ['ink on paper', colors.ink, colors.paper],
    ['ink on subtle surface', colors.ink, colors.subtle],
    ['muted on canvas (cream)', colors.muted, colors.cream],
    ['muted on paper', colors.muted, colors.paper],
    ['white on primary', colors.white, colors.primary],
    ['white on primaryPressed', colors.white, colors.primaryPressed],
    ['primary on primarySoft', colors.primary, colors.primarySoft],
    ['primary on canvas', colors.primary, colors.cream],
    ['primary on paper', colors.primary, colors.paper],
    ['ink on accent', colors.ink, colors.accent],
    ['white on danger', colors.white, colors.danger],
    ['paper on danger', colors.paper, colors.danger],
    ['danger on canvas', colors.danger, colors.cream],
    ['danger on paper', colors.danger, colors.paper],
    ['white on success', colors.white, colors.success],
    ['success on canvas', colors.success, colors.cream],
    ['success on paper', colors.success, colors.paper],
    ['warning on warningSurface', colors.warning, colors.warningSurface],
    ['warning on canvas', colors.warning, colors.cream],
    ['canvas on ink', colors.cream, colors.ink],
    ...CATEGORIES.map((c): [string, string, string] => [
      `ink on ${c}`,
      colors.ink,
      colors.category[c],
    ]),
  ]

  it.each(textPairs)('%s meets WCAG 2.2 AA text contrast (4.5:1)', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  const controlBorderPairs: [string, string, string][] = [
    ['borderControl on canvas', colors.borderControl, colors.cream],
    ['borderControl on paper', colors.borderControl, colors.paper],
    ['primary focus outline on canvas', colors.primary, colors.cream],
    ['primary focus outline on paper', colors.primary, colors.paper],
  ]

  it.each(controlBorderPairs)('%s meets WCAG 2.2 SC 1.4.11 non-text contrast (3:1)', (_n, a, b) => {
    expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('has exactly the 6 documented categories', () => {
    expect(Object.keys(colors.category)).toEqual([...CATEGORIES])
  })

  it('uses self-hosted Inter across heading and body stacks and approved DEC-003 radii/motion', () => {
    expect(fontFamily.body[0]).toBe('"Inter Variable"')
    expect(fontFamily.heading).toEqual(fontFamily.body)
    expect(radius).toEqual({ sm: '8px', md: '14px', lg: '22px' })
    expect(motion.duration).toEqual({ fast: '160ms', base: '200ms', slow: '240ms' })
  })
})
