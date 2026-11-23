import type { TFunction } from 'i18next'
import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Input } from '@/components/ui'
import { ClockInput } from '@/components/ui/ClockInput'
import { ValidationError } from '@/lib/storage'
import { CATEGORIES, type Category } from '@/styles/tokens'
import { DayToggle } from './DayToggle'
import type { TimeOfDay, Weekday } from './types'

import { orderedWeekdays, parseWallTime } from '@/lib/time/time'
import { useTimePreferences } from '@/lib/time/useTimePreferences'

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
  titleRef?: RefObject<HTMLInputElement>
}

type Errors = Partial<Record<'title' | 'time' | 'days' | 'form', string>>

/** S7 form: title, start, end, repeat days, category. Messages come from i18n. */
export function ScheduleForm({
  initial,
  onlyToday,
  submitLabel,
  onSubmit,
  onDelete,
  titleRef: externalTitleRef,
}: ScheduleFormProps) {
  const { t } = useTranslation()
  const { values: preferences } = useTimePreferences()
  const internalTitleRef = useRef<HTMLInputElement>(null)
  const titleRef = externalTitleRef ?? internalTitleRef
  const startTimeRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(initial)
  const [timeDraft, setTimeDraft] = useState<
    Partial<Pick<ScheduleFormValues, 'start_time' | 'end_time'>>
  >({})
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

  function changeTime(field: 'start_time' | 'end_time', time: string) {
    setTimeDraft((current) => ({ ...current, [field]: time }))
    setErrors((current) => ({ ...current, time: undefined }))
  }

  function validate(values: ScheduleFormValues): Errors {
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
    const normalized = {
      ...values,
      start_time:
        timeDraft.start_time === undefined
          ? values.start_time
          : (parseWallTime(timeDraft.start_time) ?? ''),
      end_time:
        timeDraft.end_time === undefined
          ? values.end_time
          : (parseWallTime(timeDraft.end_time) ?? ''),
    }
    const found = validate(normalized)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      if (found.title) titleRef.current?.focus()
      else if (found.time) startTimeRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await onSubmit(normalized)
    } catch (error) {
      setErrors(toErrors(error, t))
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Input
        ref={titleRef}
        label={t('scheduleForm.title')}
        placeholder={t('scheduleForm.titlePlaceholder')}
        value={values.title}
        maxLength={200}
        autoComplete="off"
        enterKeyHint="done"
        error={errors.title}
        onChange={(e) => change({ title: e.target.value }, 'title')}
      />
      <div className="flex flex-col gap-2 rounded-md border-hairline border-border-subtle bg-subtle/40 p-3.5">
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 [&>div]:min-w-0">
          <ClockInput
            ref={startTimeRef}
            label={t('scheduleForm.start')}
            format={preferences.time_format}
            wallTime={values.start_time}
            draft={timeDraft.start_time}
            onChange={(time) => changeTime('start_time', time)}
          />
          <ClockInput
            label={t('scheduleForm.end')}
            format={preferences.time_format}
            wallTime={values.end_time}
            draft={timeDraft.end_time}
            onChange={(time) => changeTime('end_time', time)}
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
            <legend className="mb-2 text-sm font-bold text-ink">{t('scheduleForm.repeat')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {orderedWeekdays(preferences.week_starts_on).map((day) => (
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
            <legend className="mb-2 text-sm font-bold text-ink">{t('todoForm.category')}</legend>
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
        <p
          role="alert"
          className="rounded-sm border-control border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger"
        >
          {errors.form}
        </p>
      )}
      <div className="mt-1 flex flex-col gap-2.5">
        <Button type="submit" size="lg" fullWidth disabled={saving}>
          {saving ? t('scheduleForm.saving') : submitLabel}
        </Button>
        {onDelete && (
          <Button variant="danger" fullWidth onClick={onDelete}>
            {t('scheduleForm.delete')}
          </Button>
        )}
      </div>
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
