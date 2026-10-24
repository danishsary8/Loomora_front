import { cn } from '@/lib/cn'

/** Classes shared by text fields. */
export function fieldClasses(error?: string): string {
  return cn(
    'w-full rounded-md border-thick bg-paper px-3 text-base text-ink shadow-hard-sm',
    'transition-shadow duration-100 placeholder:text-muted focus-visible:shadow-hard-md',
    'disabled:cursor-not-allowed disabled:bg-cream disabled:opacity-60',
    error ? 'border-danger' : 'border-ink',
  )
}
