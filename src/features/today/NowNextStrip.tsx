import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
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
    <Card tone={occurrence?.category ?? 'paper'} compact className="min-w-0 flex-1">
      <span className="block text-xs font-bold uppercase tracking-wide">{label}</span>
      {occurrence ? (
        <>
          <span className="block break-words font-bold">{occurrence.title}</span>
          <span className="block text-sm font-semibold">
            {t('nowNext.range', {
              start: formatTime(occurrence.start_time),
              end: formatTime(occurrence.end_time),
            })}
          </span>
        </>
      ) : (
        <span className="block font-bold text-muted">{emptyText}</span>
      )}
    </Card>
  )
}

export interface NowNextStripProps {
  now: Occurrence | null
  next: Occurrence | null
  onOpen: () => void
}

/** S3 schedule strip: NOW and NEXT cards. Tap opens the full day (S5). */
export function NowNextStrip({ now, next, onOpen }: NowNextStripProps) {
  const { t } = useTranslation()
  const { wall } = useClockDisplay()
  return (
    <button type="button" onClick={onOpen} className="flex w-full gap-3 text-left">
      <Slot
        label={t('nowNext.now')}
        occurrence={now}
        formatTime={wall}
        emptyText={t('nowNext.free')}
      />
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
