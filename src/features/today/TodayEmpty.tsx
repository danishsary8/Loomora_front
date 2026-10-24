import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'

/** S2: first action, two buttons with equal weight (D26). */
export function TodayEmpty({ onAddTodo }: { onAddTodo: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col gap-4 py-6">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-xl font-bold">{t('today.emptyTitle')}</h2>
        <p className="text-muted">{t('today.emptyMessage')}</p>
      </div>
      <div className="grid gap-3">
        <Button size="lg" fullWidth onClick={onAddTodo}>
          {t('today.addTodo')}
        </Button>
        {/* Schedule arrives in the schedule tasks (P6); disabled for now per F-006. */}
        <Button size="lg" variant="secondary" fullWidth disabled aria-describedby="schedule-soon">
          {t('today.addToSchedule')}
        </Button>
        <p id="schedule-soon" className="text-center text-sm text-muted">
          {t('today.scheduleSoon')}
        </p>
      </div>
    </Card>
  )
}
