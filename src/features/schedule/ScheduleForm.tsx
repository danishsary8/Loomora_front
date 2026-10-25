import type { TFunction } from 'i18next'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Input } from '@/components/ui'
import { ValidationError } from '@/lib/storage'
import { CATEGORIES, type Category } from '@/styles/tokens'
import { DayToggle } from './DayToggle'
import type { TimeOfDay, Weekday } from './types'

const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export interface ScheduleFormValues {
  title: string
  start_time: TimeOfDay
  end_time: TimeOfDay
  category: Category | null
  days: Weekday[]
}

export interface ScheduleFormProps {
  initial: ScheduleFormValues
  /** "Only today" edits change the title and times only. */
  onlyToday: boolean
  submitLabel: string
  /** Throw a ValidationError to show its message on the matching field. */
  onSubmit: (values: ScheduleFormValues) => Promise<void>
  onDelete?: () => void
}

type Errors = Partial<Record<'title' | 'time' | 'days' | 'form', string>>

/** S7 form: title, start, end, repeat days, category. Messages come from i18n. */
export function ScheduleForm({
  initial,
  onlyToday,
  submitLabel,
  onSubmit,
  onDelete,
}: ScheduleFormProps) {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  function change(patch: Partial<ScheduleFormValues>, clear: keyof Errors) {
    setValues((v) => ({ ...v, ...patch }))
    setErrors((e) => ({ ...e, [clear]: undefined }))
  }

  function toggleDay(day: Weekday) {
    const days = values.days.includes(day)
      ? values.days.filter((d) => d !== day)
      : [...values.days, day].sort((a, b) => a - b)
    change({ days }, 'days')
  }

  function validate(): Errors {
    const found: Errors = {}
    if (values.title.trim() === '') found.title = t('scheduleForm.titleRequired')
    if (values.start_time === '' || values.end_time === '')
      found.time = t('scheduleForm.timeRequired')
    else if (values.start_time >= values.end_time) found.time = t('scheduleForm.endAfterStart')
    if (!onlyToday && values.days.length === 0) found.days = t('scheduleForm.daysRequired')
    return found
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      if (found.title) titleRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await onSubmit(values)
    } catch (error) {
      setErrors(toErrors(error, t))
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Input
        ref={titleRef}
        label={t('scheduleForm.title')}
        placeholder={t('scheduleForm.titlePlaceholder')}
        value={values.title}
        maxLength={200}
        autoComplete="off"
        error={errors.title}
        onChange={(e) => change({ title: e.target.value }, 'title')}
      />
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="time"
            label={t('scheduleForm.start')}
            value={values.start_time}
            onChange={(e) => change({ start_time: e.target.value }, 'time')}
          />
          <Input
            type="time"
            label={t('scheduleForm.end')}
            value={values.end_time}
            onChange={(e) => change({ end_time: e.target.value }, 'time')}
          />
        </div>
        {errors.time && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {errors.time}
          </p>
        )}
      </div>
      {!onlyToday && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">{t('scheduleForm.repeat')}</legend>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((day) => (
                <DayToggle
                  key={day}
                  label={t(`weekdays.long.${day}`)}
                  text={t(`weekdays.short.${day}`)}
                  selected={values.days.includes(day)}
                  onClick={() => toggleDay(day)}
                />
              ))}
            </div>
            {errors.days && (
              <p role="alert" className="text-sm font-semibold text-danger">
                {errors.days}
              </p>
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">{t('todoForm.category')}</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  category={c}
                  selected={values.category === c}
                  onClick={() =>
                    setValues((v) => ({ ...v, category: v.category === c ? null : c }))
                  }
                />
              ))}
            </div>
          </fieldset>
        </>
      )}
      {errors.form && (
        <p role="alert" className="font-semibold text-danger">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" fullWidth disabled={saving}>
        {saving ? t('scheduleForm.saving') : submitLabel}
      </Button>
      {onDelete && (
        <Button variant="danger" fullWidth onClick={onDelete}>
          {t('scheduleForm.delete')}
        </Button>
      )}
    </form>
  )
}

function toErrors(error: unknown, t: TFunction): Errors {
  if (error instanceof ValidationError) {
    if (error.field === 'title') return { title: t('scheduleForm.titleInvalid') }
    if (error.field === 'start_time' || error.field === 'end_time')
      return { time: t('scheduleForm.endAfterStart') }
    if (error.field === 'days') return { days: t('scheduleForm.daysRequired') }
  }
  return { form: t('scheduleForm.saveError') }
}
