import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { fieldClasses } from './fieldClasses'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(field) => (
        <input ref={ref} {...field} className={cn('min-h-touch', fieldClasses(error))} {...rest} />
      )}
    </Field>
  )
})
