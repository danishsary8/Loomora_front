import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

const toneClasses = {
  danger: { box: 'border-danger bg-paper', icon: 'text-danger', Icon: AlertIcon },
  success: { box: 'border-success/40 bg-primary-soft', icon: 'text-success', Icon: CheckIcon },
} as const

/** A hairline notice with a status icon; the text stays ink for contrast (DEC-003). */
function FormNotice({
  tone,
  role,
  children,
}: {
  tone: keyof typeof toneClasses
  role: 'alert' | 'status'
  children: ReactNode
}) {
  const { box, icon, Icon } = toneClasses[tone]
  return (
    <p
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-md border-control p-3 text-sm font-semibold leading-relaxed text-ink [overflow-wrap:anywhere]',
        box,
      )}
    >
      <Icon className={cn('mt-px size-5 shrink-0', icon)} />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

/** A message for the whole form (not one field), announced to screen readers. */
export function FormError({ message }: { message: string | undefined }) {
  if (!message) return null
  return (
    <FormNotice tone="danger" role="alert">
      {message}
    </FormNotice>
  )
}

/** A finished action's confirmation, announced politely to screen readers. */
export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <FormNotice tone="success" role="status">
      {children}
    </FormNotice>
  )
}
