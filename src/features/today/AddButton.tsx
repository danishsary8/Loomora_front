import { useTranslation } from 'react-i18next'
import { pressMd } from '@/components/ui/press'

/** Floating + (docs/04): bottom right, above the phone bottom nav. */
export function AddButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('today.addTodo')}
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 grid size-16 place-items-center rounded-full border-thick border-ink bg-accent md:bottom-8 md:right-8 ${pressMd}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="square"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 4v16M4 12h16" />
      </svg>
    </button>
  )
}
