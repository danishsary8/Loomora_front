import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Chip, Input, Sheet } from '@/components/ui'
import type { LocalDate } from '@/features/todos/types'
import { useCreateTodo } from '@/features/todos/useTodos'
import { ValidationError } from '@/lib/storage'
import { CATEGORIES, type Category } from '@/styles/tokens'

export interface AddTodoSheetProps {
  open: boolean
  onClose: () => void
  /** Default due date: today when adding from Today (docs/08 rule 3). */
  today: LocalDate
}

/** S4 Add a to-do: title (focused), optional due date and category. */
export function AddTodoSheet({ open, onClose, today }: AddTodoSheetProps) {
  const { t } = useTranslation()
  const titleRef = useRef<HTMLInputElement>(null)
  const createTodo = useCreateTodo()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<LocalDate>(today)
  const [category, setCategory] = useState<Category | null>(null)
  const [titleError, setTitleError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | undefined>()

  function reset() {
    setTitle('')
    setDueDate(today)
    setCategory(null)
    setTitleError(undefined)
    setFormError(undefined)
  }

  function close() {
    reset()
    onClose()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (title.trim() === '') {
      setTitleError(t('todoForm.titleRequired'))
      titleRef.current?.focus()
      return
    }
    try {
      await createTodo.mutateAsync({
        title,
        due_date: dueDate === '' ? null : dueDate,
        ...(category ? { category } : {}),
      })
      close()
    } catch (error) {
      if (error instanceof ValidationError && error.field === 'title') setTitleError(error.message)
      else setFormError(t('today.saveError'))
    }
  }

  return (
    <Sheet open={open} onClose={close} title={t('today.addTodo')} initialFocusRef={titleRef}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          ref={titleRef}
          label={t('todoForm.title')}
          placeholder={t('todoForm.titlePlaceholder')}
          value={title}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="done"
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value)
            if (titleError) setTitleError(undefined)
          }}
        />
        <div className="flex items-end gap-2">
          <Input
            type="date"
            label={t('todoForm.dueDate')}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1"
          />
          {dueDate !== '' && (
            <Button variant="ghost" onClick={() => setDueDate('')}>
              {t('todoForm.clearDueDate')}
            </Button>
          )}
        </div>
        <fieldset className="flex flex-col gap-2">
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
        {formError && (
          <p role="alert" className="font-semibold text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={createTodo.isPending}>
          {createTodo.isPending ? t('todoForm.submitting') : t('todoForm.submit')}
        </Button>
      </form>
    </Sheet>
  )
}
