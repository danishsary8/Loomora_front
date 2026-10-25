import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import type { Category } from '@/styles/tokens'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Background: plain paper or a flat category color. */
  tone?: 'paper' | Category
  /** Tighter padding for dense lists. */
  compact?: boolean
}

const toneClasses: Record<NonNullable<CardProps['tone']>, string> = {
  paper: 'bg-paper',
  study: 'bg-category-study',
  work: 'bg-category-work',
  health: 'bg-category-health',
  life: 'bg-category-life',
  rest: 'bg-category-rest',
  other: 'bg-category-other',
}

export function Card({ tone = 'paper', compact = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-thick border-ink text-ink shadow-hard-md',
        compact ? 'p-3' : 'p-4',
        toneClasses[tone],
        className,
      )}
      {...rest}
    />
  )
}
