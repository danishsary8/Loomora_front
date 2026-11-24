import { cn } from '@/lib/cn'
import { pressSm } from '@/components/ui/press'

export interface DayToggleProps {
  label: string
  /** Short visible text, e.g. "Mon". */
  text: string
  selected: boolean
  /** Marks today's weekday with a dot and `aria-current="date"`. */
  current?: boolean
  onClick: () => void
}

/** One weekday in the repeat picker (several can be on at once). */
export function DayToggle({ label, text, selected, current = false, onClick }: DayToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={current ? 'date' : undefined}
      onClick={onClick}
      className={cn(
        'relative min-h-touch min-w-touch flex-1 select-none rounded-sm border-control px-2 text-sm font-semibold transition-[background-color,color,border-color,box-shadow] duration-fast ease-elemental',
        selected
          ? 'border-primary bg-primary text-white shadow-soft-sm'
          : 'border-border-control bg-paper text-ink hover:bg-subtle',
        current &&
          'after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full',
        current && (selected ? 'after:bg-white' : 'after:bg-primary'),
        pressSm,
      )}
    >
      {text === label ? (
        text
      ) : (
        <>
          <span aria-hidden="true">{text}</span>
          <span className="sr-only">{label}</span>
        </>
      )}
    </button>
  )
}
