import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { pressSmAny } from '@/components/ui'
import { NotesIcon, ProfileIcon } from '@/components/ui/icons'
import { useSession } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Wordmark } from './Wordmark'

/** App name (phones only; the sidebar shows it on wide screens), notes shortcut, and profile avatar. */
export function TopBar() {
  const { t } = useTranslation()
  const initial = useSession((s) => s.user?.name.trim().charAt(0).toLocaleUpperCase() ?? '')
  return (
    <header className="flex items-center justify-between gap-3 pb-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-5">
      <Wordmark className="min-w-0 text-[min(1.5rem,10vw)] [overflow-wrap:anywhere] md:hidden" />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NavLink
          to="/notes"
          aria-label={t('nav.notes')}
          className={({ isActive }) =>
            cn(
              'grid size-11 shrink-0 place-items-center rounded-full border-control',
              isActive
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border-control bg-paper text-ink hover:bg-subtle',
              pressSmAny,
            )
          }
        >
          <NotesIcon className="size-5" />
        </NavLink>
        <NavLink
          to="/profile"
          aria-label={t('nav.profile')}
          className={({ isActive }) =>
            cn(
              'grid size-11 shrink-0 place-items-center rounded-full border-control',
              isActive
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border-control bg-paper text-ink hover:bg-subtle',
              pressSmAny,
            )
          }
        >
          {initial ? (
            <span aria-hidden="true" className="text-base font-bold">
              {initial}
            </span>
          ) : (
            <ProfileIcon className="size-5" />
          )}
        </NavLink>
      </div>
    </header>
  )
}
