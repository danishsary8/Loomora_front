import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Sheet } from '@/components/ui'
import { ScheduleForm, type ScheduleFormValues } from './ScheduleForm'
import type { Occurrence, ScheduleItem } from './types'
import {
  useCreateScheduleItem,
  useSetScheduleException,
  useUpdateScheduleItem,
} from './useSchedule'
import type { DeleteRequest } from './useUndoableDelete'

/** What the sheet works on. `item` comes from Week; `occurrence` from Today. */
export type ScheduleTarget =
  | { type: 'create' }
  | { type: 'item'; item: ScheduleItem }
  | { type: 'occurrence'; item: ScheduleItem; occurrence: Occurrence }

export interface ScheduleItemSheetProps {
  open: boolean
  onClose: () => void
  target: ScheduleTarget
  /** Called for Delete; the host runs it with `useUndoableDelete`. */
  onDelete?: (request: DeleteRequest) => void
}

type Step = { name: 'choose'; action: 'edit' | 'delete' } | { name: 'form'; scope: 'today' | 'all' }

const NEW_ITEM_DEFAULTS: ScheduleFormValues = {
  title: '',
  start_time: '09:00',
  end_time: '10:00',
  category: null,
  days: [],
}

/** S7 Add / edit a schedule item. From Today it first asks "Only today" or "All repeats". */
export function ScheduleItemSheet({ open, onClose, target, onDelete }: ScheduleItemSheetProps) {
  const { t } = useTranslation()
  const title = target.type === 'create' ? t('scheduleForm.addTitle') : t('scheduleForm.editTitle')
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <SheetBody target={target} onClose={onClose} onDelete={onDelete} />
    </Sheet>
  )
}

// Own component so its step and form state are dropped each time the sheet closes.
function SheetBody({
  target,
  onClose,
  onDelete,
}: Pick<ScheduleItemSheetProps, 'target' | 'onClose' | 'onDelete'>) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>(
    target.type === 'occurrence'
      ? { name: 'choose', action: 'edit' }
      : { name: 'form', scope: 'all' },
  )
  const create = useCreateScheduleItem()
  const update = useUpdateScheduleItem()
  const setException = useSetScheduleException()

  function requestDelete(scope: 'today' | 'all') {
    if (target.type === 'create' || !onDelete) return
    onDelete(
      scope === 'all' || target.type === 'item'
        ? { scope: 'all', item: target.item }
        : { scope: 'today', item: target.item, date: target.occurrence.date },
    )
    onClose()
  }

  if (step.name === 'choose') {
    const deleting = step.action === 'delete'
    return (
      <div className="flex flex-col gap-3">
        <p className="font-semibold">
          {t(deleting ? 'scheduleScope.deleteQuestion' : 'scheduleScope.editQuestion')}
        </p>
        <Button
          size="lg"
          fullWidth
          onClick={() =>
            deleting ? requestDelete('today') : setStep({ name: 'form', scope: 'today' })
          }
        >
          {t('scheduleScope.onlyToday')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          fullWidth
          onClick={() =>
            deleting ? requestDelete('all') : setStep({ name: 'form', scope: 'all' })
          }
        >
          {t('scheduleScope.allRepeats')}
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    )
  }

  const onlyToday = step.scope === 'today'
  const initial = initialValues(target, onlyToday)

  async function onSubmit(values: ScheduleFormValues) {
    const times = { start_time: values.start_time, end_time: values.end_time }
    const category = values.category ? { category: values.category } : {}
    if (target.type === 'create') {
      await create.mutateAsync({ title: values.title, ...times, days: values.days, ...category })
    } else if (target.type === 'occurrence' && onlyToday) {
      await setException.mutateAsync({
        id: target.item.id,
        date: target.occurrence.date,
        input: { type: 'override', title: values.title, ...times },
      })
    } else {
      await update.mutateAsync({
        id: target.item.id,
        patch: { title: values.title, ...times, days: values.days, ...category },
      })
    }
    onClose()
  }

  return (
    <ScheduleForm
      initial={initial}
      onlyToday={onlyToday}
      submitLabel={t(target.type === 'create' ? 'scheduleForm.add' : 'scheduleForm.save')}
      onSubmit={onSubmit}
      {...(target.type !== 'create' && onDelete
        ? {
            onDelete: () =>
              target.type === 'occurrence'
                ? setStep({ name: 'choose', action: 'delete' })
                : requestDelete('all'),
          }
        : {})}
    />
  )
}

function initialValues(target: ScheduleTarget, onlyToday: boolean): ScheduleFormValues {
  if (target.type === 'create') return NEW_ITEM_DEFAULTS
  const { item } = target
  const source = target.type === 'occurrence' && onlyToday ? target.occurrence : item
  return {
    title: source.title,
    start_time: source.start_time,
    end_time: source.end_time,
    category: item.category,
    days: item.days,
  }
}
