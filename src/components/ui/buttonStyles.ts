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
  primary: `border-thick border-ink bg-accent text-ink ${pressMd}`,
  secondary: `border-thick border-ink bg-paper text-ink ${pressMd}`,
  danger: `border-thick border-ink bg-danger text-paper ${pressMd}`,
  ghost:
    'border-thick border-transparent bg-transparent text-ink underline-offset-4 enabled:hover:underline enabled:active:translate-y-px',
}

// Links have no :enabled state, so they press with plain `active:`.
const linkVariantClasses: Record<ButtonVariant, string> = {
  primary: `border-thick border-ink bg-accent text-ink ${pressMdAny}`,
  secondary: `border-thick border-ink bg-paper text-ink ${pressMdAny}`,
  danger: `border-thick border-ink bg-danger text-paper ${pressMdAny}`,
  ghost:
    'border-thick border-transparent bg-transparent text-ink underline-offset-4 hover:underline active:translate-y-px',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-touch px-5 text-base',
  lg: 'min-h-[52px] px-6 text-lg',
}

/** Button look for other elements, e.g. a router Link that should look like a button. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  as = 'button',
}: ButtonStyleOptions & { as?: 'button' | 'link' } = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-md font-bold',
    'disabled:cursor-not-allowed disabled:opacity-50',
    (as === 'link' ? linkVariantClasses : variantClasses)[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
  )
}
