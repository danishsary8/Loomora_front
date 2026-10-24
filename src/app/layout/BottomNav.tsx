import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './navItems'

/** Phone navigation, fixed to the bottom. Hidden from 768 px, where the sidebar takes over. */
export function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.label')}
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t-thick border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border-thin text-xs font-bold',
                  isActive ? 'border-ink bg-accent shadow-hard-sm' : 'border-transparent',
                )
              }
            >
              <Icon className="size-6" />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
