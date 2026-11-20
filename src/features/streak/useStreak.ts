import { useQuery } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { useSession } from '@/lib/api'
import { GuestStreakRepository, useStreakRepository } from '@/lib/storage'
import type { Streak } from './streak'

export const streakKeys = { all: ['streak'] as const }

/** The current streak, from this device (guest) or the server (account). */
export function useStreak(today: LocalDate) {
  const streak = useStreakRepository()
  const generation = useSession((state) => state.generation)
  const networkMode = streak instanceof GuestStreakRepository ? 'always' : 'online'
  return useQuery<Streak>({
    queryKey: [...streakKeys.all, generation, today],
    networkMode,
    queryFn: () => {
      if (useSession.getState().generation !== generation) throw new Error('Session changed')
      return streak.get(today)
    },
  })
}
