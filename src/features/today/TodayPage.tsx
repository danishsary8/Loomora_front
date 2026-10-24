import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { ErrorState, LoadingState } from '@/components/states'
import { ProgressRing } from '@/components/ui'
import { useSetTodoDone, useTodayTodos } from '@/features/todos/useTodos'
import { toLocalDate } from '@/lib/date'
import { AddButton } from './AddButton'
import { AddTodoSheet } from './AddTodoSheet'
import { TodayEmpty } from './TodayEmpty'
import { TodoRow } from './TodoRow'

/** S2/S3 Today, v1: guest to-dos only (F-006). */
export function TodayPage() {
  const { t, i18n } = useTranslation()
  const [today] = useState(() => toLocalDate())
  const [sheetOpen, setSheetOpen] = useState(false)
  const todos = useTodayTodos(today)
  const setDone = useSetTodoDone(today)

  const formatDate = useCallback(
    (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
      new Intl.DateTimeFormat(i18n.language, options).format(new Date(`${date}T00:00:00`)),
    [i18n.language],
  )

  const list = todos.data ?? []
  const doneCount = list.filter((todo) => todo.done_at !== null).length
  const openSheet = () => setSheetOpen(true)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <PageHeading>{t('pages.today.title')}</PageHeading>
        <p className="font-semibold text-muted">
          {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {todos.isPending ? (
        <LoadingState />
      ) : todos.isError ? (
        <ErrorState onRetry={() => void todos.refetch()} />
      ) : list.length === 0 ? (
        <TodayEmpty onAddTodo={openSheet} />
      ) : (
        <>
          <div className="flex justify-center">
            <ProgressRing
              value={doneCount}
              max={list.length}
              label={t('progress.doneOfTotal', { done: doneCount, total: list.length })}
            />
          </div>
          {/* pb-20: room to scroll the last row clear of the floating + */}
          <section aria-labelledby="todo-list-heading" className="flex flex-col gap-3 pb-20">
            <h2 id="todo-list-heading" className="sr-only">
              {t('today.list')}
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  formatDate={formatDate}
                  onToggle={(id, done) => setDone.mutate({ id, done })}
                />
              ))}
            </ul>
            {setDone.isError && (
              <p role="alert" className="font-semibold text-danger">
                {t('today.saveError')}
              </p>
            )}
          </section>
          <AddButton onClick={openSheet} />
        </>
      )}

      <AddTodoSheet open={sheetOpen} onClose={() => setSheetOpen(false)} today={today} />
    </div>
  )
}
