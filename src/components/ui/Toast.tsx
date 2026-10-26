export interface ToastProps {
  /** The message; `null` shows nothing (the live region stays so screen readers hear changes). */
  message: string | null
}

/** A short status message above the bottom nav. */
export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4"
    >
      {message && (
        <p className="w-full max-w-sm rounded-md border-thick border-ink bg-paper p-3 text-center font-semibold shadow-hard-md">
          {message}
        </p>
      )}
    </div>
  )
}
