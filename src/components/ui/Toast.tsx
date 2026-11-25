import { cn } from '@/lib/cn'
import { Button } from './Button'
import { AlertIcon } from './icons'

export interface ToastProps {
  /** The message; `null` shows nothing (the live region stays so screen readers hear changes). */
  message: string | null
}

/** A short status message above the bottom nav, respecting iOS safe areas. */
export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
    >
      {message && (
        <p className="w-full max-w-sm rounded-md border-hairline border-ink/10 bg-ink px-4 py-3 text-center text-sm font-semibold text-paper shadow-soft-md">
          {message}
        </p>
      )}
    </div>
  )
}

export interface ActionToastProps {
  /** The status or error text; `null` keeps the live region mounted but empty. */
  message: string | null
  /** Optional interactive action (e.g. Undo). */
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  tone?: 'default' | 'danger'
  /** Stacks above a lower toast when two undoable operations overlap. */
  stacked?: boolean
  /** Truncate long single-line messages (e.g. to-do titles) to keep the button visible. */
  truncate?: boolean
}

/** Elemental action/undo toast with soft elevation and safe-area clearance. */
export function ActionToast({
  message,
  actionLabel,
  onAction,
  actionDisabled = false,
  tone = 'default',
  stacked = false,
  truncate = false,
}: ActionToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4',
        stacked
          ? 'bottom-[calc(11rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(6rem+env(safe-area-inset-bottom))]',
      )}
    >
      {message && (
        <div
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-md border-hairline bg-paper p-3 shadow-soft-md',
            tone === 'danger' ? 'border-danger/35 text-danger' : 'border-border-subtle text-ink',
          )}
        >
          <span
            className={cn(
              'flex min-w-0 items-center gap-2 text-sm font-semibold',
              truncate && 'flex-1',
            )}
          >
            {tone === 'danger' && <AlertIcon className="size-4 shrink-0" />}
            <span className={cn(truncate && 'truncate')}>{message}</span>
          </span>
          {actionLabel && onAction && (
            <Button
              variant="secondary"
              className="shrink-0"
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
