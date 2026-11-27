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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-paper pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] shadow-soft-sheet md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-1.5">
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-xs font-semibold leading-tight transition-colors duration-fast ease-elemental',
                  isActive
                    ? 'bg-primary text-white shadow-soft-sm'
                    : 'text-muted hover:bg-subtle/60 hover:text-ink',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
