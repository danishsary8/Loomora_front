import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountDataApi, useSession } from '@/lib/api'
import { saveGuestPlan, useGuestStorage } from '@/lib/storage'
import { useSavePlanIntent } from './savePlanIntent'

/** Move the guest plan into the account. Failure keeps the plan on the device. */
export function useSavePlan() {
  const guest = useGuestStorage()
  const queryClient = useQueryClient()
  const clearIntent = useSavePlanIntent((s) => s.clear)
  const generation = useSession((state) => state.generation)
  return useMutation({
    mutationFn: () =>
      saveGuestPlan(guest, accountDataApi, () => {
        const current = useSession.getState()
        if (!current.token || current.generation !== generation) throw new Error('Session changed')
      }),
    onSuccess: async () => {
      if (useSession.getState().generation === generation) clearIntent()
      await queryClient.invalidateQueries()
    },
  })
}
