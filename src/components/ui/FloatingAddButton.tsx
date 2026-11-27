import { PlusIcon } from './icons'
import { pressMd } from './press'

/** Floating + (docs/04): bottom right, above the phone bottom nav. */
export function FloatingAddButton({
  onClick,
  onPointerDown,
  label,
}: {
  onClick: () => void
  /** Fires before the click, so a lazy sheet can start loading early. */
  onPointerDown?: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-label={label}
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-14 place-items-center rounded-full border-control border-transparent bg-accent text-ink shadow-fab hover:brightness-95 md:bottom-8 md:right-8 ${pressMd}`}
    >
      <PlusIcon className="size-7" />
    </button>
  )
}
