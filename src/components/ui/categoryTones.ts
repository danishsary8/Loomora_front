import type { Category } from '@/styles/tokens'

/** Literal Tailwind classes per category (pastel surface + jewel-toned icon), so JIT sees them. */
export const CATEGORY_TONES = {
  study: { surface: 'bg-category-study', icon: 'text-category-accent-study' },
  work: { surface: 'bg-category-work', icon: 'text-category-accent-work' },
  health: { surface: 'bg-category-health', icon: 'text-category-accent-health' },
  life: { surface: 'bg-category-life', icon: 'text-category-accent-life' },
  rest: { surface: 'bg-category-rest', icon: 'text-category-accent-rest' },
  other: { surface: 'bg-category-other', icon: 'text-category-accent-other' },
} as const satisfies Record<Category, { surface: string; icon: string }>
