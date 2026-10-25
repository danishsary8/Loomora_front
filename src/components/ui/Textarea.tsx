import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Field } from './Field'
import { fieldClasses } from './fieldClasses'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, rows = 4, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(field) => (
        <textarea
          ref={ref}
          rows={rows}
          {...field}
          className={cn('min-h-touch py-2', fieldClasses(error))}
          {...rest}
        />
      )}
    </Field>
  )
})
