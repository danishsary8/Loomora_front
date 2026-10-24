import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** Shell for the signed-in / guest app screens: Today, Week, Focus, Insights, Profile. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4 focus-visible:outline-none md:pb-10"
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
