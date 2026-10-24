import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { pressMd } from './press'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-touch px-5 text-base',
  lg: 'min-h-[52px] px-6 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-bold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    />
  )
})
