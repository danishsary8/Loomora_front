import { ErrorState } from '@/components/states'

/** Router error boundary: shown when a screen throws or fails to load. */
export function RouteError() {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 pt-12">
      <ErrorState onRetry={() => window.location.reload()} />
    </main>
  )
}
