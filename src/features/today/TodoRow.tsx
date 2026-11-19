import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button, Checkbox, Chip } from '@/components/ui'
import { PencilIcon, RepeatIcon, TrashIcon } from '@/components/ui/icons'
import type { TodayTodo } from '@/features/todos/types'
import { cn } from '@/lib/cn'
import { DoneStamp } from './DoneStamp'

interface TodoRowProps {
  todo: TodayTodo
  onToggle: (id: string, done: boolean) => void
  onEdit: (todo: TodayTodo) => void
  onDelete: (todo: TodayTodo) => void
  onAddSubtask: (parent: TodayTodo) => void
  formatDate: (date: string) => string
}

const actionClass =
  'grid size-11 shrink-0 place-items-center rounded border-thin border-ink bg-paper text-ink shadow-hard-sm hover:bg-cream active:translate-x-press-sm active:translate-y-press-sm'

export function TodoRow({ todo, ...actions }: TodoRowProps) {
  const { t, i18n } = useTranslation()
  const done = todo.done_at !== null
  const child = todo.parent_id !== null
  const canAddSubtask = !done || (todo.due_date !== null && !todo.overdue)
  const repeat = todo.repeat_rule
  const repeatLabel =
    repeat?.type === 'daily'
      ? t('today.repeatsDaily')
      : repeat?.type === 'weekly'
        ? t('today.repeatsWeekly', {
            days: new Intl.ListFormat(i18n.resolvedLanguage, { style: 'narrow' }).format(
              repeat.days.map((day) => t(`weekdays.short.${day}`)),
            ),
          })
        : null
  const total = todo.subtasks.length
  const completed = todo.subtasks.filter(({ done_at }) => done_at !== null).length

  return (
    <li
      data-testid={child ? 'subtask-row' : 'todo-row'}
      data-done={done}
      className={cn(
        'min-w-0 rounded-md border-ink bg-paper px-3 py-2',
        child ? 'border-thin' : 'border-thick shadow-hard-sm',
        done && 'bg-cream',
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={done}
          onChange={(e) => actions.onToggle(todo.id, e.target.checked)}
          aria-label={t('today.markDone', { title: todo.title })}
          className="min-w-0 flex-1 py-1 [&>span:last-child]:min-w-0"
          label={
            <span className="flex min-w-0 flex-col gap-1">
              <span className={cn('break-words font-semibold', done && 'text-muted line-through')}>
                {todo.title}
              </span>
              {repeatLabel && (
                <span className="flex items-start gap-1 text-xs font-semibold text-muted">
                  <RepeatIcon className="size-4 shrink-0" />
                  {repeatLabel}
                </span>
              )}
              <span className="flex flex-wrap items-center gap-1.5 text-sm">
                {!child && <Chip category={todo.category} />}
                <span className="rounded-full border-thin border-ink bg-paper px-2 text-xs font-bold leading-6">
                  {t(`todoForm.priorities.${todo.priority}`)}
                </span>
                {todo.overdue && (
                  <span className="rounded-full border-thin border-ink bg-danger px-2 text-xs font-bold leading-6 text-paper">
                    {t('today.overdue')}
                  </span>
                )}
                {todo.old && (
                  <span className="rounded-full border-thin border-ink bg-paper px-2 text-xs font-bold leading-6">
                    {t('today.old')}
                  </span>
                )}
                {todo.overdue && todo.due_date && (
                  <span className="text-muted">
                    {t('today.dueOn', { date: actions.formatDate(todo.due_date) })}
                  </span>
                )}
                {!child && (
                  <AnimatePresence initial={false}>
                    {done && <DoneStamp key="stamp" className="relative" />}
                  </AnimatePresence>
                )}
              </span>
            </span>
          }
        />
        <button
          type="button"
          onClick={() => actions.onEdit(todo)}
          aria-label={t('today.editTodo', { title: todo.title })}
          className={actionClass}
        >
          <PencilIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => actions.onDelete(todo)}
          aria-label={t('today.deleteTodo', { title: todo.title })}
          className={actionClass}
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      {todo.notes && (
        <p className="my-2 whitespace-pre-wrap break-words text-sm text-muted">{todo.notes}</p>
      )}
      {!child && (
        <>
          {(canAddSubtask || total > 0) && (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              {canAddSubtask && (
                <Button
                  variant="ghost"
                  onClick={() => actions.onAddSubtask(todo)}
                  aria-label={t('today.addSubtaskTo', { title: todo.title })}
                >
                  {t('today.addSubtask')}
                </Button>
              )}
              {total > 0 && (
                <p className="ml-auto pr-1 text-sm font-bold text-muted" role="status">
                  <span aria-hidden="true">
                    {t('today.subtaskProgress', { done: completed, total })}
                  </span>
                  <span className="sr-only">
                    {t('today.subtaskProgressLabel', { done: completed, total })}
                  </span>
                </p>
              )}
            </div>
          )}
          {total > 0 && (
            <ul
              className="my-2 ml-2 flex min-w-0 flex-col gap-2 border-l-thin border-ink pl-2"
              aria-label={t('today.subtaskList', { title: todo.title })}
            >
              {todo.subtasks.map((subtask) => (
                <TodoRow key={subtask.id} todo={subtask} {...actions} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}
