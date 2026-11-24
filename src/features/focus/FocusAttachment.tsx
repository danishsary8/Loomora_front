import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldClasses } from '@/components/ui/fieldClasses'
import { useScheduleItems } from '@/features/schedule/useSchedule'
import { useTodayTodos } from '@/features/todos/useTodos'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import type { FocusTimerSnapshot, TimerConfig } from './focusTimerState'

type ActiveLink = Pick<TimerConfig, 'todo_id' | 'schedule_item_id'> &
  Pick<FocusTimerSnapshot, 'startedAt'>

export function FocusAttachment({ active }: { active?: ActiveLink }) {
  const { t } = useTranslation()
  const id = useId()
  const zone = useSession((state) => state.user?.timezone)
  const [date] = useState(() => toLocalDate(new Date(active?.startedAt ?? Date.now()), zone))
  const todos = useTodayTodos(date)
  const schedule = useScheduleItems()
  const todayItems = (todos.data ?? []).flatMap((todo) => [todo, ...todo.subtasks])
  const scheduleItems = schedule.data ?? []

  if (active) {
    const label = active.todo_id
      ? todayItems.find((item) => item.id === active.todo_id)?.title
      : scheduleItems.find((item) => item.id === active.schedule_item_id)?.title
    return (
      <p className="rounded-md bg-subtle p-3 text-sm [overflow-wrap:anywhere]">
        {label
          ? t('focus.linkedItem', { title: label })
          : t(active.todo_id ? 'focus.linkedTodo' : 'focus.linkedSchedule')}
      </p>
    )
  }

  const unavailable = todos.isError || schedule.isError || todos.isPaused || schedule.isPaused
  const loading = todos.isLoading || schedule.isLoading

  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {t('focus.attachment')}
      </label>
      <select id={id} className={fieldClasses() + ' min-h-touch'} name="attachment">
        <option value="">{t('focus.noAttachment')}</option>
        {todayItems.length > 0 && (
          <optgroup label={t('focus.todayTodos')}>
            {todayItems.map((item) => (
              <option key={item.id} value={`todo:${item.id}`}>
                {item.title}
              </option>
            ))}
          </optgroup>
        )}
        {scheduleItems.length > 0 && (
          <optgroup label={t('focus.scheduleItems')}>
            {scheduleItems.map((item) => (
              <option key={item.id} value={`schedule:${item.id}`}>
                {item.title}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {(unavailable || loading || (todayItems.length === 0 && scheduleItems.length === 0)) && (
        <p role="status" className="text-sm text-muted">
          {t(
            unavailable
              ? 'focus.attachmentsUnavailable'
              : loading
                ? 'focus.attachmentsLoading'
                : 'focus.attachmentsEmpty',
          )}
        </p>
      )}
    </div>
  )
}
