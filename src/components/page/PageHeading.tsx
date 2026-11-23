import type { ReactNode } from 'react'

export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 className="font-heading text-4xl font-bold leading-tight text-ink">{children}</h1>
}
