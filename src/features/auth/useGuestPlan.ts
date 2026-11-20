import { useQuery } from '@tanstack/react-query'
import { streakKeys } from '@/features/streak/useStreak'
import { useSession } from '@/lib/api'
import { readGuestPlan, useGuestStorage } from '@/lib/storage'

export const guestPlanKey = [...streakKeys.all, 'guest-plan'] as const

/**
 * What is on this device. Kept under the streak key so every check-off refreshes it too,
 * and the import clears it with the rest.
 */
export function useGuestPlan() {
  const guest = useGuestStorage()
  const generation = useSession((state) => state.generation)
  return useQuery({
    queryKey: [...guestPlanKey, generation],
    networkMode: 'always',
    queryFn: () => {
      if (useSession.getState().generation !== generation) throw new Error('Session changed')
      return readGuestPlan(guest)
    },
  })
}
