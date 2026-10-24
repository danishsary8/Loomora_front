import type { ReactNode } from 'react'
import { Card } from '@/components/ui'

export interface EmptyStateProps {
  title: string
  message?: string
  /** Buttons or links for the next step. */
  actions?: ReactNode
}

export function EmptyState({ title, message, actions }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      {message && <p className="text-muted">{message}</p>}
      {actions && <div className="mt-2 flex w-full flex-col gap-3">{actions}</div>}
    </Card>
  )
}
