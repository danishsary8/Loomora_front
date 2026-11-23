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
