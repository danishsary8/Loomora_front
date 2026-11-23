import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './navItems'

/** Tablet and desktop navigation (docs/05: left sidebar with the same items). */
export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside
      data-testid="sidebar"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border-subtle bg-paper px-4 py-6 md:flex"
    >
      <p className="px-3 font-heading text-2xl font-bold leading-none text-ink">
        {t('common.appName')}
      </p>
      <nav aria-label={t('nav.label')}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-touch items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors duration-fast ease-elemental',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted hover:bg-subtle hover:text-ink',
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
