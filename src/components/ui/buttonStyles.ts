import { cn } from '@/lib/cn'
import { pressMd, pressMdAny } from './press'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'lg'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `border-control border-transparent bg-primary text-white enabled:hover:bg-primary-pressed enabled:active:bg-primary-pressed ${pressMd}`,
  secondary: `border-control border-border-control bg-paper text-ink enabled:hover:bg-subtle enabled:active:bg-subtle ${pressMd}`,
  danger: `border-control border-transparent bg-danger text-white enabled:hover:brightness-95 enabled:active:brightness-90 ${pressMd}`,
  ghost:
    'border-control border-transparent bg-transparent text-ink transition-colors duration-fast ease-elemental enabled:hover:bg-subtle/80 enabled:active:bg-subtle',
}

// Links have no :enabled state, so they use plain hover:/active:.
const linkVariantClasses: Record<ButtonVariant, string> = {
  primary: `border-control border-transparent bg-primary text-white hover:bg-primary-pressed active:bg-primary-pressed ${pressMdAny}`,
  secondary: `border-control border-border-control bg-paper text-ink hover:bg-subtle active:bg-subtle ${pressMdAny}`,
  danger: `border-control border-transparent bg-danger text-white hover:brightness-95 active:brightness-90 ${pressMdAny}`,
  ghost:
    'border-control border-transparent bg-transparent text-ink transition-colors duration-fast ease-elemental hover:bg-subtle/80 active:bg-subtle',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-touch px-5 text-base',
  lg: 'min-h-[52px] px-6 text-base',
}

/** Button look for other elements, e.g. a router Link that should look like a button. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  as = 'button',
}: ButtonStyleOptions & { as?: 'button' | 'link' } = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold',
    'disabled:cursor-not-allowed disabled:opacity-50',
    (as === 'link' ? linkVariantClasses : variantClasses)[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
  )
}

/** Quiet 44 px icon action (edit, delete) for list rows: no box, muted until hovered or pressed. */
export const iconActionClass =
  'grid size-11 shrink-0 place-items-center rounded-full text-muted transition-[background-color,color] duration-fast ease-elemental hover:bg-subtle hover:text-ink active:bg-subtle motion-reduce:transition-none'
