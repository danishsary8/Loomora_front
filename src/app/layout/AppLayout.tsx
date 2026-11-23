import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { cn } from '@/lib/cn'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Shell for the signed-in / guest app screens: Today, Week, Focus, Insights, Profile. */
export function AppLayout() {
  // The Week screen needs room for seven columns.
  const wide = useLocation().pathname === '/week'
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
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
