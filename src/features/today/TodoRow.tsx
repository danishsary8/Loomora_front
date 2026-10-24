import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Checkbox, Chip } from '@/components/ui'
import type { TodayTodo } from '@/features/todos/types'
import { cn } from '@/lib/cn'
import { DoneStamp } from './DoneStamp'

export interface TodoRowProps {
  todo: TodayTodo
  onToggle: (id: string, done: boolean) => void
  formatDate: (date: string) => string
}

export function TodoRow({ todo, onToggle, formatDate }: TodoRowProps) {
  const { t } = useTranslation()
  const done = todo.done_at !== null

  return (
    <li
      data-testid="todo-row"
      data-done={done}
      className={cn(
        'relative rounded-md border-thick border-ink bg-paper px-3 py-1 shadow-hard-sm',
        done && 'bg-cream',
      )}
    >
      <Checkbox
        checked={done}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        aria-label={t('today.markDone', { title: todo.title })}
        className="w-full py-1 pr-20"
        label={
          <span className="flex min-w-0 flex-col gap-1">
            <span className={cn('break-words font-semibold', done && 'text-muted line-through')}>
              {todo.title}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-sm">
              <Chip category={todo.category} />
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
                  {t('today.dueOn', { date: formatDate(todo.due_date) })}
                </span>
              )}
            </span>
          </span>
        }
      />
      <AnimatePresence initial={false}>{done && <DoneStamp key="stamp" />}</AnimatePresence>
    </li>
  )
}
