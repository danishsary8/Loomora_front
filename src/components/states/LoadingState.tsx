import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export type LoadingVariant = 'list' | 'cards' | 'summary' | 'inline'

export interface SkeletonProps {
  className?: string
}

/** Calm Elemental skeleton block that pauses under prefers-reduced-motion. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-subtle motion-reduce:animate-none', className)}
    />
  )
}

export interface LoadingStateProps {
  variant?: LoadingVariant
}

/** Skeleton shown while a screen loads (docs/05: skeleton, no splash). */
export function LoadingState({ variant = 'list' }: LoadingStateProps) {
  const { t } = useTranslation()

  if (variant === 'inline') {
    return (
      <div role="status" aria-busy="true" className="flex items-center gap-2 py-1">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-4 w-32 rounded-sm" />
      </div>
    )
  }

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 py-2">
      <span className="sr-only">{t('common.loading')}</span>
      <Skeleton className="h-8 w-2/5" />

      {variant === 'summary' && (
        <>
          <div aria-hidden="true" className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border-hairline border-border-subtle bg-paper p-3 shadow-soft-sm"
              >
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-6 w-2/3 rounded-sm" />
                <Skeleton className="h-3 w-4/5 rounded-sm" />
              </div>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-lg border-hairline border-border-subtle bg-paper p-4 shadow-soft-sm"
          >
            <Skeleton className="h-4 w-1/3 rounded-sm" />
            <Skeleton className="h-28 w-full rounded-md" />
          </div>
        </>
      )}

      {variant === 'cards' && (
        <div aria-hidden="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2.5 rounded-lg border-hairline border-border-subtle bg-paper p-4 shadow-soft-sm"
            >
              <Skeleton className="h-4 w-3/5 rounded-sm" />
              <Skeleton className="h-3 w-full rounded-sm" />
              <Skeleton className="h-3 w-2/3 rounded-sm" />
            </div>
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div
          aria-hidden="true"
          className="divide-y divide-border-subtle rounded-lg border-hairline border-border-subtle bg-paper shadow-soft-sm"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/5 rounded-sm" />
                <Skeleton className="h-3 w-2/5 rounded-sm" />
              </div>
              <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
