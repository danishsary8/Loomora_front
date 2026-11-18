import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountDataApi } from '@/lib/api'
import { saveGuestPlan, useGuestStorage } from '@/lib/storage'
import { useSavePlanIntent } from './savePlanIntent'

/** Move the guest plan into the account. Failure keeps the plan on the device. */
export function useSavePlan() {
  const guest = useGuestStorage()
  const queryClient = useQueryClient()
  const clearIntent = useSavePlanIntent((s) => s.clear)
  return useMutation({
    mutationFn: () => saveGuestPlan(guest, accountDataApi),
    onSuccess: async () => {
      clearIntent()
      await queryClient.resetQueries()
    },
  })
}
