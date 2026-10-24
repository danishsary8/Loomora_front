import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CheckIcon } from './icons'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hideLabel = false, className, disabled, ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'inline-flex min-h-touch min-w-touch select-none items-center gap-3',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-sm border-thick border-ink bg-paper text-paper shadow-hard-sm',
          'transition-[transform,box-shadow,background-color] duration-100 ease-out',
          'peer-checked:bg-success peer-checked:[&>svg]:opacity-100',
          'peer-active:translate-x-press-sm peer-active:translate-y-press-sm peer-active:shadow-none',
          'peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
          'peer-disabled:opacity-50 peer-disabled:peer-active:translate-x-0 peer-disabled:peer-active:translate-y-0 peer-disabled:peer-active:shadow-hard-sm',
        )}
      >
        <CheckIcon className="size-5 opacity-0" />
      </span>
      <span className={cn(hideLabel && 'sr-only', 'peer-disabled:opacity-50')}>{label}</span>
    </label>
  )
})
