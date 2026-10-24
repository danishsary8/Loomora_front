import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { pressSmAny } from '@/components/ui'
import { ProfileIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/** App name (phones only; the sidebar shows it on wide screens) and the profile avatar. */
export function TopBar() {
  const { t } = useTranslation()
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      <p className="font-script text-3xl font-bold leading-none md:invisible">
        {t('common.appName')}
      </p>
      <NavLink
        to="/profile"
        aria-label={t('nav.profile')}
        className={({ isActive }) =>
          cn(
            'grid size-11 place-items-center rounded-full border-thick border-ink',
            isActive ? 'bg-accent' : 'bg-paper',
            pressSmAny,
          )
        }
      >
        <ProfileIcon className="size-6" />
      </NavLink>
    </header>
  )
}
