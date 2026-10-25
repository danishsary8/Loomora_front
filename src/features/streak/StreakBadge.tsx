import { m, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StreakIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { Streak } from './streak'

const CELEBRATION_MS = 1200

/** Header badge: streak count; filled once today counted, with a small pop on the first check-off. */
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
      animate={celebrating && !reduceMotion ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'inline-flex min-h-touch items-center gap-1.5 rounded-full border-thick border-ink px-3 font-bold shadow-hard-sm',
        todayCounted ? 'bg-accent' : 'bg-paper',
      )}
    >
      <StreakIcon className="size-5" />
      <span aria-hidden="true">{count}</span>
    </m.p>
  )
}
