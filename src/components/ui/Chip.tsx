import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import type { Category } from '@/styles/tokens'
import { CATEGORY_ICONS } from './categoryIcons'
import { CheckIcon } from './icons'
import { pressSm } from './press'

export interface ChipProps {
  category: Category
  /** Visible text. Defaults to the translated category name. */
  label?: string
  /** Pass to make the chip a toggle button (for pickers). */
  onClick?: () => void
  selected?: boolean
  className?: string
}

const fillClasses: Record<Category, string> = {
  study: 'bg-category-study',
  work: 'bg-category-work',
  health: 'bg-category-health',
  life: 'bg-category-life',
  rest: 'bg-category-rest',
  other: 'bg-category-other',
}

const iconAccentClasses: Record<Category, string> = {
  study: 'text-category-accent-study',
  work: 'text-category-accent-work',
  health: 'text-category-accent-health',
  life: 'text-category-accent-life',
  rest: 'text-category-accent-rest',
  other: 'text-category-accent-other',
}

export function Chip({ category, label, onClick, selected = false, className }: ChipProps) {
  const { t } = useTranslation()
  const text = label ?? t(`categories.${category}`)
  const base = 'inline-flex select-none items-center gap-1.5 rounded-full font-medium text-ink'
  const Icon = CATEGORY_ICONS[category]

  if (!onClick) {
    return (
      <span
        className={cn(
          base,
          'min-h-7 border-hairline border-ink/10 px-2.5 text-sm shadow-soft-sm',
          fillClasses[category],
          className,
        )}
      >
        <Icon className={cn('size-3.5 shrink-0', iconAccentClasses[category])} />
        {text}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        base,
        'min-h-touch border-control px-4 text-sm font-semibold',
        fillClasses[category],
        selected
          ? cn('border-primary ring-1 ring-primary', pressSm)
          : cn('border-ink/15 hover:border-ink/40', pressSm),
        className,
      )}
    >
      {selected ? (
        <CheckIcon className="size-4 text-primary" />
      ) : (
        <Icon className={cn('size-4', iconAccentClasses[category])} />
      )}
      {text}
    </button>
  )
}
