import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Input, Sheet, Textarea } from '@/components/ui'
import { ClockInput } from '@/components/ui/ClockInput'
import { ChevronDownIcon } from '@/components/ui/icons'
import { deviceTimeZone } from '@/features/auth/timezone'
import { localReminderValue, reminderInstant } from '@/features/reminders/reminderTime'
import { useSession } from '@/lib/api'
import { DayToggle } from '@/features/schedule/DayToggle'
import type { Weekday } from '@/features/schedule/types'
import { parseWallTime, WEEKDAYS } from '@/lib/time/time'
import { useTimePreferences } from '@/lib/time/useTimePreferences'
import { Field } from '@/components/ui/Field'
import { fieldClasses } from '@/components/ui/fieldClasses'
import {
  DEFAULT_CATEGORY,
  DEFAULT_PRIORITY,
  NOTES_MAX_LENGTH,
  PRIORITIES,
  TITLE_MAX_LENGTH,
  type LocalDate,
  type Priority,
  type RepeatRule,
  type Todo,
} from '@/features/todos/types'
import { useCreateTodo, useUpdateTodo } from '@/features/todos/useTodos'
import { cn } from '@/lib/cn'
import { ValidationError } from '@/lib/storage'
import { notesTooLong } from '@/lib/storage/validation'
import { CATEGORIES, type Category } from '@/styles/tokens'

export type TodoSheetTarget =
  { type: 'create' } | { type: 'subtask'; parent: Todo } | { type: 'edit'; todo: Todo }

interface AddTodoSheetProps {
  open: boolean
  onClose: () => void
  today: LocalDate
  target: TodoSheetTarget
}

export function AddTodoSheet({ open, onClose, today, target }: AddTodoSheetProps) {
  const { t } = useTranslation()
  const { values: preferences } = useTimePreferences()
  const titleRef = useRef<HTMLInputElement>(null)
  const dueDateRef = useRef<HTMLInputElement>(null)
  const reminderDateRef = useRef<HTMLInputElement>(null)
  const reminderTimeRef = useRef<HTMLInputElement>(null)
  const repeatRef = useRef<HTMLSelectElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const create = useCreateTodo()
  const update = useUpdateTodo()
  const existing = target.type === 'edit' ? target.todo : undefined
  const timeZone = useSession((state) => state.user?.timezone) ?? deviceTimeZone()
  const savedReminder = existing?.remind_at ?? null
  const savedLocalReminder = localReminderValue(savedReminder, timeZone)
  const [reminderDate, setReminderDate] = useState(savedLocalReminder.slice(0, 10))
  const [reminderDraft, setReminderDraft] = useState<string>()
  const hasReminder = Boolean(reminderDate || reminderDraft?.trim())
  const [reminderError, setReminderError] = useState(false)
  const subtask = target.type === 'subtask' || Boolean(existing?.parent_id)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [dueDate, setDueDate] = useState<LocalDate>(existing ? (existing.due_date ?? '') : today)
  const [repeatMode, setRepeatMode] = useState<RepeatRule['type'] | 'none'>(
    existing?.repeat_rule?.type ?? 'none',
  )
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(
    existing?.repeat_rule?.type === 'weekly' ? existing.repeat_rule.days : [],
  )
  const [dueDateError, setDueDateError] = useState(false)
  const [repeatError, setRepeatError] = useState(false)
  const [category, setCategory] = useState<Category | null>(existing?.category ?? null)
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? DEFAULT_PRIORITY)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [titleError, setTitleError] = useState<string>()
  const [notesError, setNotesError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const advancedId = useId()
  const [showAdvanced, setShowAdvanced] = useState(() =>
    Boolean(
      savedReminder ||
      existing?.repeat_rule ||
      (existing?.priority && existing.priority !== DEFAULT_PRIORITY) ||
      existing?.notes?.trim(),
    ),
  )
  const pending = create.isPending || update.isPending
  const activeAdvancedCount =
    (hasReminder ? 1 : 0) +
    (repeatMode !== 'none' ? 1 : 0) +
    (priority !== DEFAULT_PRIORITY ? 1 : 0) +
    (notes.trim() ? 1 : 0)

  function changeDueDate(value: LocalDate) {
    setDueDate(value)
    if (value) setDueDateError(false)
  }

  function toggleRepeatDay(day: Weekday) {
    setRepeatDays((days) =>
      days.includes(day) ? days.filter((value) => value !== day) : [...days, day],
    )
    setRepeatError(false)
  }

  const repeatErrorMessage = repeatError ? t('todoForm.repeatDaysRequired') : undefined
  const notesLimit = t('todoForm.notesLimit', { max: NOTES_MAX_LENGTH })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setFormError(undefined)
    if (!title.trim()) {
      setTitleError(t('todoForm.titleRequired'))
      titleRef.current?.focus()
      return
    }
    if (notesTooLong(notes)) {
      setShowAdvanced(true)
      setNotesError(notesLimit)
      notesRef.current?.focus()
      return
    }

    if (!subtask && repeatMode !== 'none' && !dueDate) {
      setDueDateError(true)
      dueDateRef.current?.focus()
      return
    }
    if (!subtask && repeatMode === 'weekly' && repeatDays.length === 0) {
      setShowAdvanced(true)
      setRepeatError(true)
      repeatRef.current?.focus()
      return
    }
    const reminderTime =
      reminderDraft === undefined ? savedLocalReminder.slice(11) : parseWallTime(reminderDraft)
    const reminder = reminderDate && reminderTime ? `${reminderDate}T${reminderTime}` : ''
    const remindAt =
      reminder === savedLocalReminder ? savedReminder : reminderInstant(reminder, timeZone)
    const invalidDate = reminderDateRef.current?.validity.badInput
    if (!subtask && (invalidDate || (hasReminder && !remindAt))) {
      setShowAdvanced(true)
      setReminderError(true)
      const field = invalidDate || !reminderDate ? reminderDateRef : reminderTimeRef
      field.current?.focus()
      return
    }
    const repeatRule: RepeatRule | null =
      repeatMode === 'none'
        ? null
        : repeatMode === 'daily'
          ? { type: 'daily' }
          : { type: 'weekly', days: WEEKDAYS.filter((day) => repeatDays.includes(day)) }

    const fields = {
      title,
      priority,
      notes: notes.trim() || null,
      ...(subtask
        ? {}
        : {
            category: category ?? DEFAULT_CATEGORY,
            due_date: dueDate || null,
            repeat_rule: repeatRule,
            ...(remindAt !== savedReminder ? { remind_at: remindAt } : {}),
          }),
    }
    try {
      if (existing) await update.mutateAsync({ id: existing.id, patch: fields })
      else {
        await create.mutateAsync({
          ...fields,
          ...(target.type === 'subtask' ? { parent_id: target.parent.id } : {}),
        })
      }
      onClose()
    } catch (error) {
      if (error instanceof ValidationError && error.field === 'title') {
        setTitleError(t('todoForm.titleInvalid', { max: TITLE_MAX_LENGTH }))
        titleRef.current?.focus()
      } else if (error instanceof ValidationError && error.field === 'notes') {
        setShowAdvanced(true)
        setNotesError(notesLimit)
        notesRef.current?.focus()
      } else if (error instanceof ValidationError && error.field === 'remind_at') {
        setShowAdvanced(true)
        setReminderError(true)
        reminderTimeRef.current?.focus()
      } else setFormError(t('today.saveError'))
    }
  }

  const heading = t(existing ? 'today.editSheet' : subtask ? 'today.addSubtask' : 'today.addTodo')
  const submit = existing
    ? t(pending ? 'todoForm.saving' : 'todoForm.save')
    : t(pending ? 'todoForm.submitting' : 'todoForm.submit')
  const moreOptionsLabel = showAdvanced
    ? t('todoForm.hideOptions')
    : activeAdvancedCount > 0
      ? t('todoForm.moreOptionsCount', { count: activeAdvancedCount })
      : t('todoForm.moreOptions')

  const priorityAndNotes = (
    <>
      <Field label={t('todoForm.priority')}>
        {(field) => (
          <select
            {...field}
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className={cn('min-h-touch motion-reduce:transition-none', fieldClasses())}
          >
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t(`todoForm.priorities.${value}`)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Textarea
        ref={notesRef}
        label={t('todoForm.notes')}
        placeholder={t('todoForm.notesPlaceholder')}
        hint={notesError ? undefined : notesLimit}
        error={notesError}
        rows={3}
        value={notes}
        onChange={(event) => {
          const value = event.target.value
          setNotes(value)
          setNotesError(notesTooLong(value) ? notesLimit : undefined)
        }}
      />
    </>
  )

  return (
    <Sheet open={open} onClose={onClose} title={heading} initialFocusRef={titleRef}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          ref={titleRef}
          label={t('todoForm.title')}
          placeholder={t('todoForm.titlePlaceholder')}
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleError(undefined)
          }}
        />
        {!subtask && (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                ref={dueDateRef}
                type="date"
                label={t(repeatMode === 'none' ? 'todoForm.dueDate' : 'todoForm.repeatDueDate')}
                value={dueDate}
                aria-required={repeatMode !== 'none'}
                error={dueDateError ? t('todoForm.repeatDueDateRequired') : undefined}
                onChange={(e) => changeDueDate(e.target.value)}
                className="min-w-0 flex-1"
              />
              {dueDate !== '' && (
                <Button variant="ghost" onClick={() => changeDueDate('')}>
                  {t('todoForm.clearDueDate')}
                </Button>
              )}
            </div>
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-bold text-ink">{t('todoForm.category')}</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    category={c}
                    selected={category === c}
                    onClick={() => setCategory(category === c ? null : c)}
                  />
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                aria-expanded={showAdvanced}
                aria-controls={advancedId}
                onClick={() => setShowAdvanced((openOptions) => !openOptions)}
                className={cn(
                  'flex min-h-touch w-full items-center justify-between gap-2 rounded-md border-control border-border-control bg-subtle/60 px-3.5 py-2.5 text-left text-sm font-semibold text-ink',
                  'transition-[background-color,border-color] duration-fast ease-elemental hover:bg-subtle motion-reduce:transition-none',
                )}
              >
                <span>{moreOptionsLabel}</span>
                <ChevronDownIcon
                  className={cn(
                    'size-5 shrink-0 text-muted transition-transform duration-fast ease-elemental motion-reduce:transition-none',
                    showAdvanced && 'rotate-180',
                  )}
                />
              </button>
              {showAdvanced && (
                <div
                  id={advancedId}
                  className="flex flex-col gap-4 rounded-md border-hairline border-border-subtle bg-subtle/40 p-3.5"
                >
                  <fieldset className="flex min-w-0 flex-col gap-2">
                    <legend className="mb-1 text-sm font-bold text-ink">
                      {t('todoForm.remindMe')}
                    </legend>
                    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 [&>div]:min-w-0">
                      <Input
                        ref={reminderDateRef}
                        type="date"
                        label={t('todoForm.reminderDate')}
                        value={reminderDate}
                        onChange={(event) => {
                          setReminderDate(event.target.value)
                          setReminderError(false)
                        }}
                      />
                      <ClockInput
                        ref={reminderTimeRef}
                        label={t('todoForm.reminderClock')}
                        format={preferences.time_format}
                        draft={reminderDraft}
                        wallTime={savedLocalReminder.slice(11)}
                        onChange={(value) => {
                          setReminderDraft(value)
                          setReminderError(false)
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted">
                      {t('todoForm.reminderTimeZone', { zone: timeZone })}
                    </p>
                    {reminderError && (
                      <p role="alert" className="text-sm font-semibold text-danger">
                        {t('todoForm.reminderInvalid')}
                      </p>
                    )}
                    {hasReminder && (
                      <Button
                        variant="ghost"
                        className="self-start"
                        onClick={() => {
                          setReminderDate('')
                          setReminderDraft('')
                          setReminderError(false)
                          reminderDateRef.current?.focus()
                        }}
                      >
                        {t('todoForm.clearReminder')}
                      </Button>
                    )}
                  </fieldset>
                  <Field label={t('todoForm.repeat')} error={repeatErrorMessage}>
                    {(field) => (
                      <select
                        ref={repeatRef}
                        {...field}
                        value={repeatMode}
                        onChange={(event) => {
                          const mode = event.target.value as typeof repeatMode
                          setRepeatMode(mode)
                          setRepeatError(false)
                          if (mode === 'none') setDueDateError(false)
                        }}
                        className={cn(
                          'min-h-touch motion-reduce:transition-none',
                          fieldClasses(repeatErrorMessage),
                        )}
                      >
                        <option value="none">{t('todoForm.repeatNone')}</option>
                        <option value="daily">{t('todoForm.repeatDaily')}</option>
                        <option value="weekly">{t('todoForm.repeatWeekly')}</option>
                      </select>
                    )}
                  </Field>
                  {repeatMode === 'weekly' && (
                    <fieldset className="min-w-0">
                      <legend className="mb-2 text-sm font-bold text-ink">
                        {t('todoForm.repeatDays')}
                      </legend>
                      <div className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3">
                        {WEEKDAYS.map((day) => {
                          const label = t(`weekdays.long.${day}`)
                          return (
                            <DayToggle
                              key={day}
                              label={label}
                              text={label}
                              selected={repeatDays.includes(day)}
                              onClick={() => toggleRepeatDay(day)}
                            />
                          )
                        })}
                      </div>
                    </fieldset>
                  )}
                  {priorityAndNotes}
                </div>
              )}
            </div>
          </>
        )}
        {subtask && priorityAndNotes}
        {formError && (
          <p
            role="alert"
            className="rounded-sm border-control border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger"
          >
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={pending} className="mt-1">
          {submit}
        </Button>
      </form>
    </Sheet>
  )
}
