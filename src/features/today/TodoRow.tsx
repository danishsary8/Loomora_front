import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button, Checkbox, Chip, iconActionClass } from '@/components/ui'
import { PencilIcon, RepeatIcon, TrashIcon } from '@/components/ui/icons'
import type { TodayTodo } from '@/features/todos/types'
import { cn } from '@/lib/cn'
import { listStaggerItem } from '@/styles/motion'
import { DoneStamp } from './DoneStamp'

interface TodoRowProps {
  todo: TodayTodo
  onToggle: (id: string, done: boolean) => void
  onEdit: (todo: TodayTodo) => void
  onDelete: (todo: TodayTodo) => void
  onAddSubtask: (parent: TodayTodo) => void
  formatDate: (date: string) => string
}

export function TodoRow({ todo, ...actions }: TodoRowProps) {
  const { t, i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
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
  const hasMeta = todo.priority !== 'normal' || todo.overdue || todo.old || (!child && done)

  return (
    <m.li
      variants={child ? undefined : listStaggerItem(Boolean(reduceMotion))}
      data-testid={child ? 'subtask-row' : 'todo-row'}
      data-done={done}
      className={cn(
        'min-w-0 transition-colors duration-fast ease-elemental',
        child ? 'rounded-md border-hairline border-border-subtle bg-paper px-3 py-2' : 'px-4 py-3',
        done && 'bg-paper/70',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Checkbox
          shape="circle"
          checked={done}
          onChange={(e) => actions.onToggle(todo.id, e.target.checked)}
          aria-label={t('today.markDone', { title: todo.title })}
          className="min-w-[min(100%,10rem)] flex-1 py-0.5 [&>span:last-child]:min-w-0"
          label={
            <span className="flex min-w-0 flex-col gap-1">
              <span
                className={cn(
                  'break-words text-[15px] font-semibold leading-snug text-ink',
                  done && 'text-muted line-through',
                )}
              >
                {todo.title}
              </span>
              {repeatLabel && (
                <span className="flex items-center gap-1 text-xs font-medium text-muted">
                  <RepeatIcon className="size-3.5 shrink-0" />
                  {repeatLabel}
                </span>
              )}
              {hasMeta && (
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  {todo.priority !== 'normal' && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border-hairline px-2.5 py-0.5 font-medium',
                        todo.priority === 'high'
                          ? 'border-warning/35 bg-warning-surface text-warning'
                          : 'border-border-subtle bg-subtle text-muted',
                      )}
                    >
                      {t(`todoForm.priorities.${todo.priority}`)}
                    </span>
                  )}
                  {todo.overdue && (
                    <span className="inline-flex items-center rounded-full bg-danger px-2.5 py-0.5 font-semibold text-white">
                      {t('today.overdue')}
                    </span>
                  )}
                  {todo.old && (
                    <span className="inline-flex items-center rounded-full border-hairline border-border-subtle bg-subtle px-2.5 py-0.5 font-medium text-muted">
                      {t('today.old')}
                    </span>
                  )}
                  {todo.overdue && todo.due_date && (
                    <span className="font-medium tabular-nums text-muted">
                      {t('today.dueOn', { date: actions.formatDate(todo.due_date) })}
                    </span>
                  )}
                  {!child && (
                    <AnimatePresence initial={false}>
                      {done && <DoneStamp key="stamp" className="relative" />}
                    </AnimatePresence>
                  )}
                </span>
              )}
            </span>
          }
        />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!child && <Chip category={todo.category} className="min-h-6 px-2.5 text-xs" />}
          <div className="-mr-1.5 flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => actions.onEdit(todo)}
              aria-label={t('today.editTodo', { title: todo.title })}
              className={iconActionClass}
            >
              <PencilIcon className="h-icon-sm w-icon-sm" />
            </button>
            <button
              type="button"
              onClick={() => actions.onDelete(todo)}
              aria-label={t('today.deleteTodo', { title: todo.title })}
              className={iconActionClass}
            >
              <TrashIcon className="h-icon-sm w-icon-sm" />
            </button>
          </div>
        </div>
      </div>
      {todo.notes && (
        <p className="mt-1.5 pl-9 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
          {todo.notes}
        </p>
      )}
      {!child && (
        <>
          {(canAddSubtask || total > 0) && (
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2',
                total > 0 ? 'mt-2 border-t-hairline border-border-subtle/70 pt-1.5' : 'mt-0.5 pl-7',
              )}
            >
              {canAddSubtask && (
                <Button
                  variant="ghost"
                  className="px-2 text-xs font-medium text-muted hover:text-ink"
                  onClick={() => actions.onAddSubtask(todo)}
                  aria-label={t('today.addSubtaskTo', { title: todo.title })}
                >
                  {t('today.addSubtask')}
                </Button>
              )}
              {total > 0 && (
                <p
                  className="ml-auto pr-1 text-xs font-semibold tabular-nums text-muted"
                  role="status"
                >
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
              className="mt-2 ml-2 flex min-w-0 flex-col gap-2 border-l-hairline border-border-subtle pl-3"
              aria-label={t('today.subtaskList', { title: todo.title })}
            >
              {todo.subtasks.map((subtask) => (
                <TodoRow key={subtask.id} todo={subtask} {...actions} />
              ))}
            </ul>
          )}
        </>
      )}
    </m.li>
  )
}
