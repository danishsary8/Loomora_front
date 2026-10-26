import { useState } from 'react'
import { useSession } from '@/lib/api'
import { checkOffCount, hadFullDay } from '@/lib/storage'
import type { LocalDate } from '@/features/todos/types'
import { isSnoozed, readDismissedOn, writeDismissedOn } from './savePlanDismissal'
import { SavePlanSheet } from './SavePlanSheet'
import { useGuestPlan } from './useGuestPlan'

/** Check-offs that make the prompt appear (docs/04 Flow 3). */
export const PROMPT_CHECK_OFFS = 3

export interface SavePlanPromptProps {
  today: LocalDate
}

/**
 * Offers guests to save their plan after 3 check-offs or after a day that was fully done
 * (a day before today, so it never covers the check-off celebration); "Not now" snoozes it.
 */
export function SavePlanPrompt({ today }: SavePlanPromptProps) {
  const isGuest = useSession((s) => s.token === null)
  const plan = useGuestPlan().data
  const [dismissedOn, setDismissedOn] = useState(readDismissedOn)

  const earned =
    plan !== undefined && (checkOffCount(plan) >= PROMPT_CHECK_OFFS || hadFullDay(plan, today))
  const open = isGuest && earned && !isSnoozed(dismissedOn, today)

  function dismiss() {
    writeDismissedOn(today)
    setDismissedOn(today)
  }

  return <SavePlanSheet open={open} onClose={dismiss} />
}
