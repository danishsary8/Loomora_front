import type { ReactNode } from 'react'

export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 className="font-script text-5xl font-bold leading-none">{children}</h1>
}
