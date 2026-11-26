import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { SproutIcon } from '@/components/ui/icons'

export interface EmptyStateProps {
  title: string
  message?: string
  /** Optional illustration-style icon shown above the title. Defaults to a calm botanical sprout. */
  icon?: ReactNode
  /** Buttons or links for the next step. */
  actions?: ReactNode
}

export function EmptyState({ title, message, icon, actions }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <div
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border-hairline border-primary/15 bg-primary-soft text-primary shadow-soft-sm"
      >
        {icon ?? <SproutIcon className="h-icon-lg w-icon-lg" />}
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <h2 className="text-balance text-lg font-bold text-ink">{title}</h2>
        {message && <p className="text-sm leading-relaxed text-muted">{message}</p>}
      </div>
      {actions && <div className="mt-2 flex w-full max-w-xs flex-col gap-3">{actions}</div>}
    </Card>
  )
}
