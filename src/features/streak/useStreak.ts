import { useQuery } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { useStreakRepository } from '@/lib/storage'
import type { Streak } from './streak'

export const streakKeys = { all: ['streak'] as const }

/** The current streak, from this device (guest) or the server (account). */
export function useStreak(today: LocalDate) {
  const streak = useStreakRepository()
  return useQuery<Streak>({
    queryKey: [...streakKeys.all, today],
    queryFn: () => streak.get(today),
  })
}
