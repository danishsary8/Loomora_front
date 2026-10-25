import { cn } from '@/lib/cn'
import { pressSm } from '@/components/ui/press'

export interface DayToggleProps {
  label: string
  /** Short visible text, e.g. "Mon". */
  text: string
  selected: boolean
  onClick: () => void
}

/** One weekday in the repeat picker (several can be on at once). */
export function DayToggle({ label, text, selected, onClick }: DayToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'min-h-touch min-w-touch flex-1 select-none rounded-md border-thick border-ink px-1 text-sm font-bold',
        selected ? 'bg-ink text-cream' : 'bg-paper text-ink',
        pressSm,
      )}
    >
      {text}
    </button>
  )
}
