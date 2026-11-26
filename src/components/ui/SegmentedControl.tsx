import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  label: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

/** Accessible multi-option toggle group (DEC-003) for binary/compact choices (e.g. 12h/24h, Day/Week). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex w-full rounded-md border-control border-border-control bg-subtle p-1',
        disabled && 'opacity-60',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(option.value)
            }}
            className={cn(
              'min-h-touch flex-1 rounded-sm px-1.5 text-sm sm:px-3 font-semibold transition-[background-color,color,box-shadow] duration-fast ease-elemental',
              'disabled:cursor-not-allowed',
              selected ? 'bg-primary text-white shadow-soft-sm' : 'text-ink hover:bg-paper/70',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
