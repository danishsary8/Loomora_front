import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CheckIcon } from './icons'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  /** Visual box shape: rounded square (default) or round circle for to-do rows. */
  shape?: 'square' | 'circle'
  /** Decorative layer drawn over the box (e.g. a check-off spark). */
  overlay?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hideLabel = false, shape = 'square', overlay, className, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'relative inline-flex min-h-touch min-w-touch select-none items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6 shrink-0 place-items-center border-control border-border-control bg-paper text-white shadow-soft-sm',
          shape === 'circle' ? 'rounded-full' : 'rounded-sm',
          'transition-[transform,background-color,border-color] duration-fast ease-elemental',
          'peer-checked:border-primary peer-checked:bg-primary peer-checked:[&>svg]:opacity-100',
          'peer-active:scale-95 motion-reduce:peer-active:scale-100',
          'peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
          'peer-disabled:opacity-50 peer-disabled:peer-active:scale-100',
        )}
      >
        <CheckIcon className="size-4 opacity-0 transition-opacity duration-fast" />
      </span>
      {overlay}
      <span className={cn(hideLabel && 'sr-only', 'peer-disabled:opacity-50')}>{label}</span>
    </label>
  )
})
