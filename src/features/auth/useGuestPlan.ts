import { useQuery } from '@tanstack/react-query'
import { streakKeys } from '@/features/streak/useStreak'
import { readGuestPlan, useGuestStorage } from '@/lib/storage'

/**
 * What is on this device. Kept under the streak key so every check-off refreshes it too,
 * and the import clears it with the rest.
 */
export function useGuestPlan() {
  const guest = useGuestStorage()
  return useQuery({
    queryKey: [...streakKeys.all, 'guest-plan'],
    queryFn: () => readGuestPlan(guest),
  })
}
