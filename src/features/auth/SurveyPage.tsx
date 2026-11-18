import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Button, Chip, Input } from '@/components/ui'
import { authApi, useSession, type Goal, type User } from '@/lib/api'
import type { Category } from '@/styles/tokens'
import { FormError } from './FormError'
import { useFormAction } from './useFormAction'

const GOALS: { goal: Goal; color: Category }[] = [
  { goal: 'be_consistent', color: 'health' },
  { goal: 'manage_time', color: 'work' },
  { goal: 'finish_tasks', color: 'study' },
  { goal: 'other', color: 'other' },
]

// S10 step 2: the skippable sign-up survey (display name, biggest goal, how you heard).
export function SurveyPage() {
  const user = useSession((s) => s.user)
  if (!user || user.survey_done) return <Navigate to="/today" replace />
  return <SurveyForm user={user} />
}

function SurveyForm({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setUser = useSession((s) => s.setUser)
  const { pending, formError, fieldErrors, run } = useFormAction()
  const [name, setName] = useState(user.name)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [heardFrom, setHeardFrom] = useState('')

  function finish(save: boolean) {
    void run(async () => {
      const newName = name.trim()
      if (save && newName && newName !== user.name) await authApi.updateMe({ name: newName })
      setUser(
        await authApi.submitSurvey(save ? { goal, heard_from: heardFrom.trim() || null } : {}),
      )
      navigate('/today', { replace: true })
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    finish(true)
  }

  return (
    <StandalonePage>
      <PageHeading>{t('auth.survey.title')}</PageHeading>
      <p>{t('auth.survey.intro')}</p>
      <p className="text-sm text-muted">{t('auth.survey.verifyNote', { email: user.email })}</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <FormError message={formError} />
        <Input
          label={t('auth.survey.name')}
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-bold">{t('auth.survey.goal')}</legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(({ goal: value, color }) => (
              <Chip
                key={value}
                category={color}
                label={t(`auth.survey.goals.${value}`)}
                selected={goal === value}
                onClick={() => setGoal(goal === value ? null : value)}
              />
            ))}
          </div>
        </fieldset>
        <Input
          label={t('auth.survey.heardFrom')}
          maxLength={500}
          value={heardFrom}
          onChange={(e) => setHeardFrom(e.target.value)}
          error={fieldErrors.heard_from}
        />
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {t('auth.survey.continue')}
        </Button>
        <Button variant="ghost" fullWidth disabled={pending} onClick={() => finish(false)}>
          {t('auth.survey.skip')}
        </Button>
      </form>
    </StandalonePage>
  )
}
