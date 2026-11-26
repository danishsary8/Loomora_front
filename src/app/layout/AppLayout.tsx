import { m, useReducedMotion } from 'framer-motion'
import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { cn } from '@/lib/cn'
import { pageEnterMotion } from '@/styles/motion'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Shell for the signed-in / guest app screens: Today, Week, Focus, Insights, Profile. */
export function AppLayout() {
  const { pathname } = useLocation()
  const reduceMotion = useReducedMotion()
  // Skip fade on initial mount so first paint and LCP stay immediate; animate client-side route changes.
  const [initialPath] = useState(pathname)
  const [hasNavigated, setHasNavigated] = useState(false)
  if (!hasNavigated && pathname !== initialPath) {
    setHasNavigated(true)
  }

  // The Week screen needs room for seven columns.
  const wide = pathname === '/week'
  const enter = pageEnterMotion(Boolean(reduceMotion) || !hasNavigated)

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className={cn(
            'mx-auto w-full flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 focus-visible:outline-none md:px-6 md:pb-12 md:pt-4',
            wide ? 'max-w-6xl' : 'max-w-2xl',
          )}
        >
          <Suspense fallback={<LoadingState />}>
            <m.div key={pathname} {...enter}>
              <Outlet />
            </m.div>
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
