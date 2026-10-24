import { QueryClient } from '@tanstack/react-query'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Guest data is local, so there is nothing to refetch on focus or reconnect.
      queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
    },
  })
}
