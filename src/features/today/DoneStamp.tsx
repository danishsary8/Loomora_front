import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { checkOffPopMotion } from '@/styles/motion'

export interface DoneStampProps {
  className?: string
}

/** Elemental "Done!" badge shown on a checked row (docs/04 check-off path). */
export function DoneStamp({ className }: DoneStampProps = {}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const pop = checkOffPopMotion(Boolean(reduceMotion))
  return (
    <m.span
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex select-none items-center rounded-full border-hairline border-success/40 bg-primary-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-success',
        className ?? 'absolute right-3 top-1/2 -translate-y-1/2',
      )}
      {...pop}
    >
      {t('today.doneStamp')}
    </m.span>
  )
}
