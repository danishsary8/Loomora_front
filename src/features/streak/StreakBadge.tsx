import { m, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StreakIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { Streak } from './streak'

const CELEBRATION_MS = 1200

/** Header peach card: streak count with flame; warms up once today counted, with a small pop. */
export function StreakBadge({ count, todayCounted }: Streak) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [celebrating, setCelebrating] = useState(false)
  const wasCounted = useRef(todayCounted)

  // Only a change while the screen is open is a celebration, not the first load.
  useEffect(() => {
    if (todayCounted && !wasCounted.current) {
      setCelebrating(true)
      const timer = setTimeout(() => setCelebrating(false), CELEBRATION_MS)
      wasCounted.current = todayCounted
      return () => clearTimeout(timer)
    }
    wasCounted.current = todayCounted
  }, [todayCounted])

  return (
    <m.p
      role="status"
      data-testid="streak-badge"
      data-today-counted={todayCounted}
      data-celebrating={celebrating}
      aria-label={t(todayCounted ? 'streak.counted' : 'streak.open', { count })}
      animate={celebrating && !reduceMotion ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: 0.32 }}
      className={cn(
        'inline-flex min-h-touch max-w-full items-center gap-2 rounded-md border-hairline px-3 py-1.5 text-xs font-semibold leading-tight text-ink shadow-soft-sm transition-colors duration-fast ease-elemental',
        todayCounted ? 'border-accent/65 bg-accent/45' : 'border-accent/40 bg-warning-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full text-ink',
          todayCounted ? 'bg-accent/55' : 'bg-accent/30',
        )}
      >
        <StreakIcon className="h-icon-sm w-icon-sm" />
      </span>
      <span
        aria-hidden="true"
        className="min-w-0 max-w-[5rem] tabular-nums [overflow-wrap:anywhere]"
      >
        {t('streak.days', { count })}
      </span>
    </m.p>
  )
}
