import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import type { Category } from '@/styles/tokens'
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

export function Chip({ category, label, onClick, selected = false, className }: ChipProps) {
  const { t } = useTranslation()
  const text = label ?? t(`categories.${category}`)
  const base =
    'inline-flex select-none items-center gap-1.5 rounded-full border-thin border-ink font-semibold text-ink'

  if (!onClick) {
    return (
      <span className={cn(base, 'min-h-7 px-3 text-sm', fillClasses[category], className)}>
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
        'min-h-touch px-4 text-base',
        selected ? cn(fillClasses[category], pressSm) : 'bg-paper',
        className,
      )}
    >
      {selected ? (
        <CheckIcon className="size-4" />
      ) : (
        <span
          aria-hidden="true"
          className={cn('size-3 rounded-full border-thin border-ink', fillClasses[category])}
        />
      )}
      {text}
    </button>
  )
}
