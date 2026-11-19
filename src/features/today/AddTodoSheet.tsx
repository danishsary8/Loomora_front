import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Input, Sheet } from '@/components/ui'
import { DayToggle } from '@/features/schedule/DayToggle'
import type { Weekday } from '@/features/schedule/types'
import { WEEKDAYS } from '@/features/schedule/week/weekPlan'
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
  const titleRef = useRef<HTMLInputElement>(null)
  const dueDateRef = useRef<HTMLInputElement>(null)
  const repeatRef = useRef<HTMLSelectElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const create = useCreateTodo()
  const update = useUpdateTodo()
  const existing = target.type === 'edit' ? target.todo : undefined
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
  const pending = create.isPending || update.isPending

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
      setRepeatError(true)
      repeatRef.current?.focus()
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
        setNotesError(notesLimit)
        notesRef.current?.focus()
      } else setFormError(t('today.saveError'))
    }
  }

  const heading = t(existing ? 'today.editSheet' : subtask ? 'today.addSubtask' : 'today.addTodo')
  const submit = existing
    ? t(pending ? 'todoForm.saving' : 'todoForm.save')
    : t(pending ? 'todoForm.submitting' : 'todoForm.submit')

  return (
    <Sheet open={open} onClose={onClose} title={heading} initialFocusRef={titleRef}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
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
            <div className="flex items-end gap-2">
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
                <legend className="mb-2 text-sm font-bold">{t('todoForm.repeatDays')}</legend>
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
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm font-bold">{t('todoForm.category')}</legend>
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
          </>
        )}
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
        <Field
          label={t('todoForm.notes')}
          hint={notesError ? undefined : notesLimit}
          error={notesError}
        >
          {(field) => (
            <textarea
              ref={notesRef}
              {...field}
              rows={3}
              className={cn(
                'resize-y py-2 motion-reduce:transition-none',
                fieldClasses(notesError),
              )}
              value={notes}
              onChange={(event) => {
                const value = event.target.value
                setNotes(value)
                setNotesError(notesTooLong(value) ? notesLimit : undefined)
              }}
            />
          )}
        </Field>
        {formError && (
          <p role="alert" className="font-semibold text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {submit}
        </Button>
      </form>
    </Sheet>
  )
}
