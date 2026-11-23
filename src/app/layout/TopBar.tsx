import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { pressSmAny } from '@/components/ui'
import { ProfileIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/** App name (phones only; the sidebar shows it on wide screens) and the profile avatar. */
export function TopBar() {
  const { t } = useTranslation()
  return (
    <header className="flex items-center justify-between gap-3 pb-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-5">
      <p className="font-heading text-2xl font-bold leading-none text-ink md:invisible">
        {t('common.appName')}
      </p>
      <NavLink
        to="/profile"
        aria-label={t('nav.profile')}
        className={({ isActive }) =>
          cn(
            'grid size-11 place-items-center rounded-full border-control',
            isActive
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border-control bg-paper text-ink hover:bg-subtle',
            pressSmAny,
          )
        }
      >
        <ProfileIcon className="size-5" />
      </NavLink>
    </header>
  )
}
