import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import type { Occurrence } from '@/features/schedule'

interface SlotProps {
  label: string
  occurrence: Occurrence | null
  emptyText: string
}

function Slot({ label, occurrence, emptyText }: SlotProps) {
  const { t } = useTranslation()
  return (
    <Card tone={occurrence?.category ?? 'paper'} compact className="min-w-0 flex-1">
      <span className="block text-xs font-bold uppercase tracking-wide">{label}</span>
      {occurrence ? (
        <>
          <span className="block break-words font-bold">{occurrence.title}</span>
          <span className="block text-sm font-semibold">
            {t('nowNext.range', { start: occurrence.start_time, end: occurrence.end_time })}
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
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('nowNext.openDay')}
      className="flex w-full gap-3 text-left"
    >
      <Slot label={t('nowNext.now')} occurrence={now} emptyText={t('nowNext.free')} />
      <Slot label={t('nowNext.next')} occurrence={next} emptyText={t('nowNext.nothingMore')} />
    </button>
  )
}
