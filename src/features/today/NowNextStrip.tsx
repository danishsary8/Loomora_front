import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { ArrowRightIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { useClockDisplay } from '@/lib/time/useTimePreferences'
import type { Occurrence } from '@/features/schedule'

interface SlotProps {
  label: string
  occurrence: Occurrence | null
  emptyText: string
  formatTime: (time: string) => string
}

function Slot({ label, occurrence, emptyText, formatTime }: SlotProps) {
  const { t } = useTranslation()
  return (
    <Card
      tone={occurrence?.category ?? 'paper'}
      compact
      className="min-w-0 flex-1 transition-shadow duration-fast ease-elemental group-hover:shadow-soft-md"
    >
      <span className={cn('block text-xs font-semibold', occurrence ? 'text-ink' : 'text-muted')}>
        {label}
      </span>
      {occurrence ? (
        <>
          <span className="mt-0.5 block break-words text-sm font-semibold text-ink">
            {occurrence.title}
          </span>
          <span className="mt-0.5 block text-xs font-medium tabular-nums text-ink">
            {t('nowNext.range', {
              start: formatTime(occurrence.start_time),
              end: formatTime(occurrence.end_time),
            })}
          </span>
        </>
      ) : (
        <span className="mt-0.5 block text-sm font-medium text-muted">{emptyText}</span>
      )}
    </Card>
  )
}

export interface NowNextStripProps {
  now: Occurrence | null
  next: Occurrence | null
  onOpen: () => void
}

/** S3 schedule strip: NOW → NEXT mini-cards with arrow between them. Tap opens the full day (S5). */
export function NowNextStrip({ now, next, onOpen }: NowNextStripProps) {
  const { t } = useTranslation()
  const { wall } = useClockDisplay()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-touch w-full items-center gap-2 rounded-lg text-left transition-transform duration-fast ease-elemental active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Slot
        label={t('nowNext.now')}
        occurrence={now}
        formatTime={wall}
        emptyText={t('nowNext.free')}
      />
      <ArrowRightIcon className="h-icon-sm w-icon-sm shrink-0 text-muted" />
      <Slot
        label={t('nowNext.next')}
        occurrence={next}
        formatTime={wall}
        emptyText={t('nowNext.nothingMore')}
      />
      <span className="sr-only">{t('nowNext.openDay')}</span>
    </button>
  )
}
