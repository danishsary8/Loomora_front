import { cn } from '@/lib/cn'
import { pressSm } from '@/components/ui/press'

export interface DayToggleProps {
  label: string
  /** Short visible text, e.g. "Mon". */
  text: string
  /** Optional calendar date number shown below the weekday in the Week strip (e.g. "23"). */
  dayNumber?: string
  selected: boolean
  /** Marks today's weekday with a dot and `aria-current="date"`. */
  current?: boolean
  /** `strip` softens borders inside a framed day-rail container. */
  variant?: 'picker' | 'strip'
  onClick: () => void
}

/** One weekday in the repeat picker or Week day strip. */
export function DayToggle({
  label,
  text,
  dayNumber,
  selected,
  current = false,
  variant = 'picker',
  onClick,
}: DayToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={current ? 'date' : undefined}
      onClick={onClick}
      className={cn(
        'relative min-h-touch min-w-touch flex-1 select-none rounded-md px-1.5 font-semibold transition-[background-color,color,border-color,box-shadow] duration-fast ease-elemental',
        dayNumber
          ? 'flex flex-col items-center justify-center gap-0.5 py-2 text-xs'
          : 'px-2 text-sm',
        variant === 'picker' ? 'border-control' : 'border-hairline',
        selected
          ? 'border-primary bg-primary text-white shadow-soft-sm'
          : variant === 'strip'
            ? 'border-transparent bg-transparent text-ink hover:bg-subtle'
            : 'border-border-control bg-paper text-ink hover:bg-subtle',
        current &&
          'pb-2.5 after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full',
        current && (selected ? 'after:bg-white' : 'after:bg-primary'),
        pressSm,
      )}
    >
      {text === label && !dayNumber ? (
        text
      ) : (
        <>
          <span
            aria-hidden="true"
            className={cn(
              dayNumber && (selected ? 'text-[11px] text-white/85' : 'text-[11px] text-muted'),
            )}
          >
            {text}
          </span>
          {dayNumber && (
            <span aria-hidden="true" className="text-sm font-bold tabular-nums leading-none">
              {dayNumber}
            </span>
          )}
          <span className="sr-only">{label}</span>
        </>
      )}
    </button>
  )
}
