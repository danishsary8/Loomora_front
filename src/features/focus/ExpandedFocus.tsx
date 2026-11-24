import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
  surfaceRef: RefObject<HTMLDivElement>
  onExit: () => void
}

export function ExpandedFocus({ children, surfaceRef, onExit }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const exitRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const surface = surfaceRef.current
    if (!dialog || !surface) return

    let wasFullscreen = false
    function handleFullscreenChange() {
      const isFullscreen = document.fullscreenElement === surface
      if (wasFullscreen && !isFullscreen) onExit()
      wasFullscreen = isFullscreen
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    dialog.showModal()
    exitRef.current?.focus()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      dialog.close()
    }
  }, [onExit, surfaceRef])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-canvas p-0 text-ink"
      onCancel={(event) => {
        event.preventDefault()
        onExit()
      }}
    >
      <div
        ref={surfaceRef}
        className="size-full overflow-y-auto overscroll-contain bg-canvas [overflow-wrap:anywhere]"
      >
        <div className="mx-auto flex min-h-full w-full max-w-2xl min-w-0 flex-col gap-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {t('focus.presentation.title')}
            </h2>
            <Button ref={exitRef} variant="secondary" className="max-w-full" onClick={onExit}>
              {t('focus.presentation.exit')}
            </Button>
          </header>
          <div className="my-auto flex min-w-0 flex-col gap-4">{children}</div>
        </div>
      </div>
    </dialog>
  )
}
