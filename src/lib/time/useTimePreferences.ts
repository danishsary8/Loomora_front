import { useContext } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi, useSession } from '@/lib/api'
import {
  GuestPreferenceDatabaseContext,
  readGuestPreferences,
  writeGuestPreferences,
} from '@/lib/storage/guestPreferences'
import { openGuestDatabase } from '@/lib/storage/openGuestDatabase'
import {
  DEFAULT_TIME_PREFERENCES,
  formatInstantTime,
  formatWallTime,
  type TimePreferences,
} from './time'

const guestKey = ['guest-time-preferences'] as const
const guestSaveKey = [...guestKey, 'save'] as const

export function useTimePreferences() {
  const user = useSession((state) => state.user)
  const guest = useSession((state) => state.token === null)
  const generation = useSession((state) => state.generation)
  const db = useContext(GuestPreferenceDatabaseContext)
  // Older persisted sessions predate the preference fields. Refresh them once from /me.
  const missing = !guest && (!user?.time_format || !user?.week_starts_on)
  const prefs = useQuery({
    queryKey: guest ? guestKey : ['account-time-preferences', generation],
    enabled: guest || missing,
    networkMode: guest ? 'always' : 'online',
    staleTime: guest ? 0 : Infinity,
    refetchOnWindowFocus: guest,
    queryFn: async ({ signal }) => {
      if (guest) return readGuestPreferences(db ?? (await openGuestDatabase()))
      const current = useSession.getState()
      if (current.generation !== generation) throw new Error('Session changed')
      const updated = await authApi.getMe(signal)
      if (current.user && updated.id !== current.user.id) throw new Error('Account changed')
      if (!updated.time_format || !updated.week_starts_on)
        throw new Error('Missing account preferences')
      const latest = useSession.getState()
      if (latest.generation === generation) {
        latest.setUser(
          latest.user
            ? {
                ...latest.user,
                time_format: latest.user.time_format ?? updated.time_format,
                week_starts_on: latest.user.week_starts_on ?? updated.week_starts_on,
              }
            : updated,
        )
      }
      const { time_format, week_starts_on } = updated
      return { time_format, week_starts_on }
    },
  })

  const unavailable = prefs.isError || prefs.isPaused
  return {
    values: (guest ? prefs.data : missing ? undefined : user) ?? DEFAULT_TIME_PREFERENCES,
    loading: (guest || missing) && prefs.isPending && !unavailable,
    failed: (guest || missing) && unavailable,
    retry: () => void prefs.refetch(),
  }
}

export function useSaveGuestTimePreferences() {
  const db = useContext(GuestPreferenceDatabaseContext)
  const client = useQueryClient()
  const pending = useIsMutating({ mutationKey: guestSaveKey }) > 0
  const mutation = useMutation({
    mutationKey: guestSaveKey,
    networkMode: 'always',
    mutationFn: async (changes: Partial<TimePreferences>) =>
      writeGuestPreferences(db ?? (await openGuestDatabase()), changes),
    onSuccess: (values) => client.setQueryData(guestKey, values),
  })
  return { ...mutation, pending }
}

export function useClockDisplay() {
  const { i18n } = useTranslation()
  const {
    values: { time_format: format },
  } = useTimePreferences()
  const zone = useSession((state) => (state.token ? state.user?.timezone : undefined))
  return {
    wall: (time: string) => formatWallTime(time, format, i18n.language),
    instant: (time: string) => formatInstantTime(time, format, i18n.language, zone),
  }
}
