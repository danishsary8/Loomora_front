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
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r-thick border-ink bg-paper p-4 md:flex"
    >
      <p className="font-script text-4xl font-bold leading-none">{t('common.appName')}</p>
      <nav aria-label={t('nav.label')}>
        <ul className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-touch items-center gap-3 rounded-md border-thin px-3 font-bold',
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
    </aside>
  )
}
