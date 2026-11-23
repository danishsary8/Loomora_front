import { cn } from '@/lib/cn'

/** Classes shared by text fields (DEC-003: >= 3:1 control border, soft elevation). */
export function fieldClasses(error?: string): string {
  return cn(
    'w-full rounded-sm border-control bg-paper px-3 text-base text-ink shadow-soft-sm',
    'transition-[border-color,box-shadow] duration-fast ease-elemental placeholder:text-muted focus-visible:border-primary',
    'disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60',
    error ? 'border-danger' : 'border-border-control',
  )
}
