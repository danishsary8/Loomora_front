import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Wordmark } from './Wordmark'
import { NAV_ITEMS } from './navItems'

/** Tablet and desktop navigation (docs/05: left sidebar with the same items). */
export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside
      data-testid="sidebar"
      className="hidden min-h-dvh w-60 shrink-0 self-stretch border-r border-border-subtle bg-paper md:block"
    >
      <div className="sticky top-0 flex flex-col gap-6 px-4 py-6">
        <Wordmark className="px-3 text-2xl" />
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
                        ? 'bg-primary text-white shadow-soft-sm'
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
      </div>
    </aside>
  )
}
