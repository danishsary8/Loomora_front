import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Sheet } from '@/components/ui'
import { DayToggle } from '../DayToggle'
import type { ScheduleItem, Weekday } from '../types'
import { useCopyDay } from './useWeek'
import { WEEKDAYS } from './weekPlan'

export interface CopyDaySheetProps {
  /** The day to copy; `null` keeps the sheet closed. */
  from: Weekday | null
  items: readonly ScheduleItem[]
  onClose: () => void
}

/** S8 Copy day: pick the days that get the same items as the source day. */
export function CopyDaySheet({ from, items, onClose }: CopyDaySheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet
      open={from !== null}
      onClose={onClose}
      title={from === null ? '' : t('copyDay.title', { day: t(`weekdays.long.${from}`) })}
    >
      {from !== null && <CopyDayBody from={from} items={items} onClose={onClose} />}
    </Sheet>
  )
}

// Own component so the picked days are dropped each time the sheet closes.
function CopyDayBody({
  from,
  items,
  onClose,
}: Omit<CopyDaySheetProps, 'from'> & { from: Weekday }) {
  const { t } = useTranslation()
  const [targets, setTargets] = useState<Weekday[]>([])
  const copy = useCopyDay(items)

  function toggle(day: Weekday) {
    setTargets((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    )
  }

  async function submit() {
    await copy.mutateAsync({ from, to: targets })
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t('copyDay.hint')}</p>
      <div role="group" aria-label={t('copyDay.targets')} className="flex gap-2">
        {WEEKDAYS.filter((day) => day !== from).map((day) => (
          <DayToggle
            key={day}
            label={t(`weekdays.long.${day}`)}
            text={t(`weekdays.short.${day}`)}
            selected={targets.includes(day)}
            onClick={() => toggle(day)}
          />
        ))}
      </div>
      {copy.isError && (
        <p role="alert" className="font-semibold text-danger">
          {t('copyDay.error')}
        </p>
      )}
      <Button
        size="lg"
        fullWidth
        disabled={targets.length === 0 || copy.isPending}
        onClick={() => void submit()}
      >
        {t(copy.isPending ? 'copyDay.copying' : 'copyDay.submit')}
      </Button>
    </div>
  )
}
