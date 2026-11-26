import { pressMd } from './press'

/** Floating + (docs/04): bottom right, above the phone bottom nav. */
export function FloatingAddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full border-control border-transparent bg-accent text-ink shadow-soft-md hover:brightness-95 md:bottom-8 md:right-8 ${pressMd}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}
