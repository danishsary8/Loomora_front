import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Sheet, Toast } from '@/components/ui'
import { useSession } from '@/lib/api'
import { useSavePlanIntent } from './savePlanIntent'
import { useSavePlan } from './useSavePlan'

const SAVED_TOAST_MS = 4000

/**
 * Runs the import once the visitor who asked to save their plan is signed in (docs/04 Flow 3).
 * Success shows a toast; failure keeps the plan on the device and offers a retry.
 */
export function SavePlanImport() {
  const { t } = useTranslation()
  const signedIn = useSession((s) => s.token !== null)
  const { pending, clear } = useSavePlanIntent()
  const save = useSavePlan()
  const { mutate, reset, isIdle } = save

  useEffect(() => {
    if (signedIn && pending && isIdle) mutate()
  }, [signedIn, pending, isIdle, mutate])

  const { isSuccess } = save
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(reset, SAVED_TOAST_MS)
    return () => clearTimeout(timer)
  }, [isSuccess, reset])

  function giveUp() {
    clear()
    reset()
  }

  const message = save.isPending
    ? t('savePlan.saving')
    : save.isSuccess && save.data
      ? t('savePlan.saved')
      : null

  return (
    <>
      <Toast message={message} />
      <Sheet open={save.isError} onClose={giveUp} title={t('savePlan.failedTitle')}>
        <div className="flex flex-col gap-4">
          <p>{t('savePlan.failedBody')}</p>
          <Button size="lg" fullWidth onClick={() => mutate()}>
            {t('savePlan.retry')}
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={giveUp}>
            {t('savePlan.notNow')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
