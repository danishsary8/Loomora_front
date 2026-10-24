import { CATEGORIES, colors, contrastRatio } from './tokens'

const AA_TEXT = 4.5

describe('design tokens', () => {
  it('computes known contrast ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  // Every pair of text color and background that the components use.
  const textPairs: [string, string, string][] = [
    ['ink on cream', colors.ink, colors.cream],
    ['ink on paper', colors.ink, colors.paper],
    ['muted on cream', colors.muted, colors.cream],
    ['muted on paper', colors.muted, colors.paper],
    ['ink on accent', colors.ink, colors.accent],
    ['white on danger', colors.paper, colors.danger],
    ['danger on cream', colors.danger, colors.cream],
    ['danger on paper', colors.danger, colors.paper],
    ['success on cream', colors.success, colors.cream],
    ['success on paper', colors.success, colors.paper],
    ['cream on ink', colors.cream, colors.ink],
    ...CATEGORIES.map((c): [string, string, string] => [
      `ink on ${c}`,
      colors.ink,
      colors.category[c],
    ]),
  ]

  it.each(textPairs)('%s meets 4.5:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('has exactly the 6 categories from docs/08', () => {
    expect(Object.keys(colors.category)).toEqual([...CATEGORIES])
  })
})
