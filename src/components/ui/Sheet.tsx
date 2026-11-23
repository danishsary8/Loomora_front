import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from './icons'
import { pressSm } from './press'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Element to focus on open (e.g. a title field). Defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Mark background content `inert` while the modal is open (blocking pointer, keyboard, and
 * assistive-tech traversal in browsers) without disabling the dialog itself or top-level
 * notification regions (e.g. PWA update / reminder banners). Restores prior state on close.
 */
function lockBackground(portalRoot: HTMLElement | null): () => void {
  const isNotificationRegion = (el: HTMLElement) =>
    el.matches('section[aria-label], [role="region"]')
  const targets: HTMLElement[] = []
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (portalRoot && (child === portalRoot || child.contains(portalRoot))) continue
    if (
      child.id === 'root' ||
      Array.from(child.children).some(
        (grandchild) => grandchild instanceof HTMLElement && isNotificationRegion(grandchild),
      )
    ) {
      for (const rootChild of Array.from(child.children)) {
        if (!(rootChild instanceof HTMLElement)) continue
        if (isNotificationRegion(rootChild)) continue
        targets.push(rootChild)
      }
    } else {
      targets.push(child)
    }
  }

  const saved = targets.map((el) => ({
    el,
    hadInert: el.hasAttribute('inert'),
  }))
  for (const { el } of saved) {
    el.setAttribute('inert', '')
  }
  return () => {
    for (const { el, hadInert } of saved) {
      if (!hadInert) el.removeAttribute('inert')
    }
  }
}

/** Bottom sheet dialog: Escape and backdrop close it, background is inert, focus stays inside. */
export function Sheet({ open, onClose, title, children, initialFocusRef }: SheetProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const portalRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Latest onClose for the key handler, without re-running the open effect.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const unlockBackground = lockBackground(portalRef.current)

    const panel = panelRef.current
    const first = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (!firstItem || !lastItem) return
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      unlockBackground()
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus()
      } else {
        document.getElementById('main')?.focus({ preventScroll: true })
      }
    }
  }, [open, initialFocusRef])

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div ref={portalRef} className="fixed inset-0 z-50 flex items-end justify-center">
          <m.div
            data-testid="sheet-backdrop"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-lg border-t border-border-subtle bg-paper pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-3 shadow-soft-sheet focus-visible:outline-none"
            {...panelMotion}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border-control/50"
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id={titleId} className="font-heading text-2xl font-bold leading-tight text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className={`grid size-11 shrink-0 place-items-center rounded-md border-control border-border-control bg-paper text-ink hover:bg-subtle ${pressSm}`}
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
